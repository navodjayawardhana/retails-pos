<?php

namespace App\Services\Hrm;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\EmployeeSalaryComponent;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\HrSetting;
use App\Models\LeaveRequest;
use App\Models\LoanRepayment;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\PayslipItem;
use App\Models\Sale;
use App\Models\SalaryComponent;
use App\Models\Warehouse;
use App\Repositories\ExpenseRepository;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

/**
 * Payroll calculation. Every payslip line is stored with its basis so a payslip can be explained.
 *
 * Money rules (see docs/hrm-conventions.md, phase 4):
 *  - monthly: basic (pro-rated for mid-month joiners/leavers) − no-pay (day rate × (unpaid leave + absent days))
 *  - daily:   daily rate × payable days (worked + paid leave + paid holidays if enabled)
 *  - OT: hours × hourly rate × multiplier; late: minutes × hourly/60 (when enabled)
 *  - EPF base = basic after no-pay (monthly) or basic line (daily) + epf-liable earnings
 */
class PayrollService
{
    private WorkScheduleService $schedule;

    private LeaveService $leave;

    private ?array $settings = null;

    public function __construct(WorkScheduleService $schedule, LeaveService $leave)
    {
        $this->schedule = $schedule;
        $this->leave = $leave;
    }

    private function settings(): array
    {
        return $this->settings ??= HrSetting::getAll();
    }

    // ------------------------------------------------------------------ runs

    public function createRun(array $data, ?int $userId): PayrollRun
    {
        $month = $this->monthStart($data['month']);
        $warehouseId = $data['warehouse_id'] ?? null;
        $departmentId = $data['department_id'] ?? null;

        $exists = PayrollRun::whereDate('month', $month)
            ->where('warehouse_id', $warehouseId)->where('department_id', $departmentId)->exists();
        if ($exists) {
            throw new UnprocessableEntityHttpException('A payroll run for this month and scope already exists. Open it and recalculate instead.');
        }

        return DB::transaction(function () use ($month, $warehouseId, $departmentId, $data, $userId) {
            $run = PayrollRun::create([
                'month' => $month,
                'warehouse_id' => $warehouseId,
                'department_id' => $departmentId,
                'status' => PayrollRun::STATUS_DRAFT,
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
            ]);

            return $this->calculate($run);
        });
    }

    /**
     * (Re)calculate every payslip of a draft run. Manual adjustment lines are kept.
     */
    public function calculate(PayrollRun $run): PayrollRun
    {
        $this->assertDraft($run);

        return DB::transaction(function () use ($run) {
            $manual = PayslipItem::where('is_manual', true)
                ->whereIn('payslip_id', $run->payslips()->pluck('id'))
                ->with('payslip:id,employee_id')->get()
                ->groupBy(fn (PayslipItem $i) => $i->payslip->employee_id);

            $run->payslips()->delete();

            $skipped = [];
            foreach ($this->employeesInScope($run) as $employee) {
                $other = Payslip::where('employee_id', $employee->id)->whereDate('month', $run->month)
                    ->where('payroll_run_id', '!=', $run->id)->exists();
                if ($other) {
                    $skipped[] = ['employee_id' => $employee->id, 'employee_code' => $employee->employee_code,
                        'employee_name' => $employee->full_name, 'reason' => 'Already has a payslip for this month in another run.'];

                    continue;
                }
                $this->buildPayslip($run, $employee, ($manual->get($employee->id) ?? collect())->all());
            }

            $run->skipped = $skipped;

            return $this->refreshTotals($run);
        });
    }

    /**
     * Recalculate one employee's payslip in a draft run (after an adjustment change).
     */
    public function recalculatePayslip(Payslip $payslip): Payslip
    {
        $run = $payslip->payrollRun;
        $this->assertDraft($run);

        return DB::transaction(function () use ($payslip, $run) {
            $manual = $payslip->items()->where('is_manual', true)->get()->all();
            $employee = $payslip->employee;
            $payslip->delete();
            $fresh = $this->buildPayslip($run, $employee, $manual);
            $this->refreshTotals($run);

            return $fresh;
        });
    }

    public function addAdjustment(Payslip $payslip, array $data): Payslip
    {
        $this->assertDraft($payslip->payrollRun);
        $payslip->items()->create([
            'type' => $data['type'] === 'deduction' ? PayslipItem::TYPE_DEDUCTION : PayslipItem::TYPE_EARNING,
            'code' => 'adjustment',
            'label' => $data['label'],
            'amount' => round((float) $data['amount'], 2),
            'basis' => $data['basis'] ?? 'Manual adjustment',
            'epf_liable' => $data['type'] !== 'deduction' && ! empty($data['epf_liable']),
            'is_manual' => true,
            'sort' => 90,
        ]);

        return $this->recalculatePayslip($payslip->fresh());
    }

    public function removeAdjustment(Payslip $payslip, int $itemId): Payslip
    {
        $this->assertDraft($payslip->payrollRun);
        $item = $payslip->items()->where('id', $itemId)->where('is_manual', true)->first();
        if (! $item) {
            throw new UnprocessableEntityHttpException('Only manual adjustment lines can be removed.');
        }
        $item->delete();

        return $this->recalculatePayslip($payslip->fresh());
    }

    /**
     * Lock the run and record loan/advance repayments.
     */
    public function approve(PayrollRun $run, ?int $userId): PayrollRun
    {
        $this->assertDraft($run);
        if (! $run->payslips()->exists()) {
            throw new UnprocessableEntityHttpException('This run has no payslips to approve.');
        }

        return DB::transaction(function () use ($run, $userId) {
            $loanItems = PayslipItem::where('code', 'loan')->whereNotNull('employee_loan_id')
                ->whereIn('payslip_id', $run->payslips()->pluck('id'))->get();
            foreach ($loanItems as $item) {
                $loan = EmployeeLoan::lockForUpdate()->find($item->employee_loan_id);
                if (! $loan) {
                    continue;
                }
                $amount = min($item->amount, $loan->balance);
                if ($amount <= 0) {
                    continue;
                }
                LoanRepayment::create([
                    'employee_loan_id' => $loan->id,
                    'payroll_run_id' => $run->id,
                    'payslip_id' => $item->payslip_id,
                    'amount' => $amount,
                    'date' => $run->month->copy()->endOfMonth()->toDateString(),
                    'type' => 'payroll',
                    'notes' => 'Payroll '.$run->month->format('F Y'),
                    'created_by' => $userId,
                ]);
                $this->applyRepayment($loan, $amount);
            }

            $run->update([
                'status' => PayrollRun::STATUS_APPROVED,
                'approved_by' => $userId,
                'approved_at' => now(),
            ]);

            return $run->fresh();
        });
    }

    /**
     * Mark an approved run paid; optionally record the net total as an expense.
     */
    public function markPaid(PayrollRun $run, bool $createExpense, ?string $paidDate, ?int $userId): PayrollRun
    {
        if ($run->status !== PayrollRun::STATUS_APPROVED) {
            throw new UnprocessableEntityHttpException('Only an approved run can be marked as paid.');
        }

        return DB::transaction(function () use ($run, $createExpense, $paidDate, $userId) {
            $expenseId = null;
            if ($createExpense && $run->net_total > 0) {
                $expenseId = $this->createSalaryExpense($run, $paidDate ?: HrSetting::today())->id;
            }
            $run->update([
                'status' => PayrollRun::STATUS_PAID,
                'paid_by' => $userId,
                'paid_at' => now(),
                'expense_id' => $expenseId,
            ]);

            return $run->fresh();
        });
    }

    public function deleteRun(PayrollRun $run): void
    {
        $this->assertDraft($run);
        $run->delete();
    }

    public function applyRepayment(EmployeeLoan $loan, float $amount): void
    {
        $loan->balance = round(max(0, $loan->balance - $amount), 2);
        if ($loan->balance <= 0) {
            $loan->status = EmployeeLoan::STATUS_COMPLETED;
        }
        $loan->save();
    }

    // ------------------------------------------------------------------ calculation

    public function employeesInScope(PayrollRun $run): Collection
    {
        $start = $run->month->copy()->startOfMonth()->toDateString();
        $end = $run->month->copy()->endOfMonth()->toDateString();

        return Employee::with(['warehouse', 'department', 'designation'])
            ->when($run->warehouse_id, fn ($q) => $q->where('warehouse_id', $run->warehouse_id))
            ->when($run->department_id, fn ($q) => $q->where('department_id', $run->department_id))
            ->where(function ($q) use ($start) {
                // active, or left during/after this month
                $q->where('status', Employee::STATUS_ACTIVE)
                    ->orWhere(function ($q) use ($start) {
                        $q->whereNotNull('leaving_date')->whereDate('leaving_date', '>=', $start);
                    });
            })
            ->where(function ($q) use ($end) {
                $q->whereNull('joining_date')->orWhereDate('joining_date', '<=', $end);
            })
            ->orderBy('employee_code')
            ->get();
    }

    /**
     * Breakdown for one employee and month without saving anything (also used by tests/preview).
     */
    public function compute(Employee $employee, string $monthStart): array
    {
        $s = $this->settings();
        $month = Carbon::parse($monthStart)->startOfMonth();
        $monthEnd = $month->copy()->endOfMonth();
        $periodStart = $employee->joining_date && $employee->joining_date->greaterThan($month) ? $employee->joining_date->copy() : $month->copy();
        $periodEnd = $employee->leaving_date && $employee->leaving_date->lessThan($monthEnd) ? $employee->leaving_date->copy() : $monthEnd->copy();
        $today = HrSetting::today();

        $wdpm = max(1, (float) $s['working_days_per_month']);
        $hpd = max(1, (float) $s['working_hours_per_day']);
        $isDaily = $employee->salary_type === 'daily';
        $basicSalary = (float) $employee->basic_salary;

        $lines = [];
        $add = function (string $type, string $code, string $label, float $amount, ?string $basis = null, array $extra = []) use (&$lines) {
            $lines[] = array_merge([
                'type' => $type, 'code' => $code, 'label' => $label, 'amount' => round($amount, 2), 'basis' => $basis,
                'quantity' => null, 'rate' => null, 'epf_liable' => false, 'is_manual' => false,
                'salary_component_id' => null, 'employee_loan_id' => null, 'sort' => 0,
            ], $extra);
        };

        $empty = $periodStart->greaterThan($periodEnd);

        // ---- day counts
        $monthWorkingDays = $this->schedule->workingDays($employee, $month->toDateString(), $monthEnd->toDateString());
        $employedWorkingDays = $empty ? 0.0 : $this->schedule->workingDays($employee, $periodStart->toDateString(), $periodEnd->toDateString());
        $leaveWeights = $empty ? [] : $this->leaveWeights($employee, $periodStart->toDateString(), $periodEnd->toDateString());
        $records = $empty ? collect() : Attendance::where('employee_id', $employee->id)
            ->whereDate('date', '>=', $periodStart->toDateString())->whereDate('date', '<=', $periodEnd->toDateString())
            ->get()->keyBy(fn ($r) => $r->date->format('Y-m-d'));

        $workedDays = 0.0;
        $absentDays = 0.0;
        $paidHolidays = 0.0;
        $otMinutes = 0;
        $lateMinutes = 0;
        if (! $empty) {
            $cursor = $periodStart->copy();
            while ($cursor->lessThanOrEqualTo($periodEnd)) {
                $date = $cursor->toDateString();
                $day = $this->schedule->forDate($employee, $date);
                $weight = $day['is_working_day'] ? ($day['is_saturday_half_day'] ? 0.5 : 1.0) : 0.0;
                $record = $records->get($date);
                if ($record) {
                    $otMinutes += (int) $record->ot_minutes;
                    $lateMinutes += (int) $record->late_minutes;
                }
                if ($day['is_holiday'] && $day['holiday'] && $day['holiday']->is_paid && ! $day['is_weekend']) {
                    $paidHolidays += 1;
                }
                if ($weight > 0) {
                    $status = $record ? $record->status : null;
                    $missing = 0.0;
                    if (in_array($status, ['present', 'late'], true)) {
                        $workedDays += $weight;
                    } elseif ($status === 'half_day') {
                        $workedDays += $weight / 2;
                        $missing = $weight / 2;
                    } elseif ($status === 'absent') {
                        $missing = $weight;
                    } elseif ($status === null && $date <= $today && $s['payroll_unmarked_as_absent']) {
                        $missing = $weight;
                    }
                    $absentDays += max(0, $missing - ($leaveWeights[$date] ?? 0));
                }
                $cursor->addDay();
            }
        }

        $leave = $this->leave->monthSummary($employee, (int) $month->year, (int) $month->month);
        $paidLeave = (float) $leave['paid_days'];
        $unpaidLeave = (float) $leave['unpaid_days'];

        // ---- basic
        if ($isDaily) {
            $rate = $basicSalary;
            $hourly = $rate / $hpd;
            $payableDays = $workedDays + $paidLeave + ($s['daily_wage_paid_holidays'] ? $paidHolidays : 0);
            $basicAmount = $rate * $payableDays;
            $add('earning', 'basic', 'Basic wage', $basicAmount,
                sprintf('%s days × %s/day (worked %s + paid leave %s%s)', $this->num($payableDays), $this->money($rate),
                    $this->num($workedDays), $this->num($paidLeave),
                    $s['daily_wage_paid_holidays'] ? ' + paid holidays '.$this->num($paidHolidays) : ''),
                ['quantity' => $payableDays, 'rate' => $rate, 'sort' => 1]);
            $epfBasic = round($basicAmount, 2);
            $percentBase = round($basicAmount, 2);
        } else {
            $hourly = $basicSalary / ($wdpm * $hpd);
            $basicAmount = $basicSalary;
            $basis = 'Monthly basic salary';
            if ($s['payroll_prorate_joiners'] && $monthWorkingDays > 0 && $employedWorkingDays < $monthWorkingDays) {
                $basicAmount = $basicSalary * $employedWorkingDays / $monthWorkingDays;
                $basis = sprintf('%s × %s of %s working days (joined/left mid-month)', $this->money($basicSalary),
                    $this->num($employedWorkingDays), $this->num($monthWorkingDays));
            }
            $basicAmount = round($basicAmount, 2);
            $add('earning', 'basic', 'Basic salary', $basicAmount, $basis, ['epf_liable' => true, 'sort' => 1]);
            $payableDays = max(0, $employedWorkingDays - $absentDays - $unpaidLeave);

            $dayRate = $basicSalary / $wdpm;
            $noPayDays = $absentDays + $unpaidLeave;
            $noPay = min($basicAmount, round($dayRate * $noPayDays, 2));
            if ($noPay > 0) {
                $add('deduction', 'no_pay', 'No-pay deduction', $noPay,
                    sprintf('%s days × %s/day (absent %s + unpaid leave %s; day rate = basic ÷ %s)', $this->num($noPayDays),
                        $this->money($dayRate), $this->num($absentDays), $this->num($unpaidLeave), $this->num($wdpm)),
                    ['quantity' => $noPayDays, 'rate' => round($dayRate, 4), 'sort' => 50]);
            }
            $epfBasic = round($basicAmount - $noPay, 2);
            $percentBase = $basicSalary;
        }

        // ---- overtime
        $otEligible = $employee->ot_eligible === null ? true : (bool) $employee->ot_eligible;
        if ($otEligible && $otMinutes > 0) {
            $multiplier = $employee->ot_rate_multiplier !== null ? (float) $employee->ot_rate_multiplier : (float) $s['ot_multiplier'];
            $otHours = $otMinutes / 60;
            $add('earning', 'ot', 'Overtime', $otHours * $hourly * $multiplier,
                sprintf('%s h × %s/h × %s', $this->num($otHours), $this->money($hourly), $this->num($multiplier)),
                ['quantity' => round($otHours, 2), 'rate' => round($hourly * $multiplier, 4), 'sort' => 10]);
        }

        // ---- late deduction
        $lateEnabled = $employee->late_deduction_enabled === null ? (bool) $s['late_deduction_enabled'] : (bool) $employee->late_deduction_enabled;
        if ($lateEnabled && $lateMinutes > 0) {
            $perMinute = $hourly / 60;
            $add('deduction', 'late', 'Late deduction', $lateMinutes * $perMinute,
                sprintf('%d min × %s/min', $lateMinutes, $this->money($perMinute)),
                ['quantity' => $lateMinutes, 'rate' => round($perMinute, 4), 'sort' => 51]);
        }

        // ---- salary structure components
        foreach ($this->structure($employee, $monthEnd->toDateString()) as $line) {
            /** @var SalaryComponent $component */
            $component = $line->component;
            $amount = $component->amountFor((float) $percentBase, $line->value);
            if ($amount <= 0) {
                continue;
            }
            $value = $line->value ?? $component->default_value;
            $basis = $component->calculation === SalaryComponent::CALC_PERCENT
                ? sprintf('%s%% of %s', $this->num($value), $this->money($percentBase))
                : 'Fixed amount';
            $isEarning = $component->type === SalaryComponent::TYPE_EARNING;
            $add($isEarning ? 'earning' : 'deduction', 'component', $component->name, $amount, $basis, [
                'epf_liable' => $isEarning && $component->epf_liable,
                'salary_component_id' => $component->id,
                'sort' => $isEarning ? 20 : 60,
            ]);
        }

        // ---- POS sales commission
        $commission = $this->commission($employee, $month);
        if ($commission) {
            $add('earning', 'commission', 'Sales commission', $commission['amount'],
                sprintf('%s%% of %s POS sales', $this->num($commission['percent']), $this->money($commission['sales'])),
                ['quantity' => $commission['sales'], 'rate' => $commission['percent'], 'sort' => 30]);
        }

        // ---- loans / advances
        foreach (EmployeeLoan::where('employee_id', $employee->id)->where('status', EmployeeLoan::STATUS_ACTIVE)->orderBy('id')->get() as $loan) {
            $installment = $loan->installmentFor($month->toDateString());
            if ($installment <= 0) {
                continue;
            }
            $add('deduction', 'loan', ucfirst($loan->type).' repayment', $installment,
                sprintf('Installment %s (balance before %s)', $this->money($installment), $this->money($loan->balance)),
                ['employee_loan_id' => $loan->id, 'sort' => 70]);
        }

        return [
            'lines' => $lines,
            'epf_basic' => $epfBasic,
            'working_days' => $employedWorkingDays,
            'payable_days' => $payableDays,
            'worked_days' => $workedDays,
            'absent_days' => $absentDays,
            'unpaid_leave_days' => $unpaidLeave,
            'paid_leave_days' => $paidLeave,
            'paid_holidays' => $paidHolidays,
            'ot_hours' => round($otMinutes / 60, 2),
            'late_minutes' => $lateMinutes,
        ];
    }

    private function buildPayslip(PayrollRun $run, Employee $employee, array $manualItems): Payslip
    {
        $s = $this->settings();
        $calc = $this->compute($employee, $run->month->toDateString());
        $lines = $calc['lines'];

        foreach ($manualItems as $item) {
            $lines[] = [
                'type' => $item->type, 'code' => 'adjustment', 'label' => $item->label, 'amount' => (float) $item->amount,
                'basis' => $item->basis, 'quantity' => null, 'rate' => null, 'epf_liable' => (bool) $item->epf_liable,
                'is_manual' => true, 'salary_component_id' => null, 'employee_loan_id' => null, 'sort' => 90,
            ];
        }

        // ---- EPF / ETF
        $epfApplicable = $employee->epf_applicable === null ? true : (bool) $employee->epf_applicable;
        $epfBase = 0.0;
        $epfEmployee = $epfEmployer = $etf = 0.0;
        if ($epfApplicable) {
            $liableEarnings = collect($lines)->where('type', 'earning')->where('epf_liable', true)
                ->where('code', '!=', 'basic')->sum('amount');
            $epfBase = round(max(0, $calc['epf_basic'] + $liableEarnings), 2);
            $epfEmployee = round($epfBase * (float) $s['epf_employee_rate'] / 100, 2);
            $epfEmployer = round($epfBase * (float) $s['epf_employer_rate'] / 100, 2);
            $etf = round($epfBase * (float) $s['etf_rate'] / 100, 2);
            if ($epfEmployee > 0) {
                $lines[] = $this->statutory('deduction', 'epf_employee', 'EPF (employee '.$this->num($s['epf_employee_rate']).'%)', $epfEmployee, $epfBase, 80);
            }
            if ($epfEmployer > 0) {
                $lines[] = $this->statutory('employer', 'epf_employer', 'EPF (employer '.$this->num($s['epf_employer_rate']).'%)', $epfEmployer, $epfBase, 100);
            }
            if ($etf > 0) {
                $lines[] = $this->statutory('employer', 'etf', 'ETF ('.$this->num($s['etf_rate']).'%)', $etf, $epfBase, 101);
            }
        }

        $gross = round(collect($lines)->where('type', 'earning')->sum('amount'), 2);
        $deductions = round(collect($lines)->where('type', 'deduction')->sum('amount'), 2);

        $payslip = Payslip::create([
            'payroll_run_id' => $run->id,
            'employee_id' => $employee->id,
            'month' => $run->month->toDateString(),
            'employee_code' => $employee->employee_code,
            'employee_name' => $employee->full_name,
            'designation_name' => optional($employee->designation)->name,
            'department_name' => optional($employee->department)->name,
            'branch_name' => optional($employee->warehouse)->name,
            'salary_type' => $employee->salary_type,
            'basic_salary' => $employee->basic_salary,
            'nic' => $employee->nic,
            'epf_no' => $employee->epf_no,
            'bank_name' => $employee->bank_name,
            'bank_branch' => $employee->bank_branch,
            'bank_account_no' => $employee->bank_account_no,
            'working_days' => $calc['working_days'],
            'payable_days' => $calc['payable_days'],
            'absent_days' => $calc['absent_days'],
            'unpaid_leave_days' => $calc['unpaid_leave_days'],
            'paid_leave_days' => $calc['paid_leave_days'],
            'ot_hours' => $calc['ot_hours'],
            'late_minutes' => $calc['late_minutes'],
            'gross_earnings' => $gross,
            'total_deductions' => $deductions,
            'net_pay' => round($gross - $deductions, 2),
            'epf_base' => $epfBase,
            'epf_employee' => $epfEmployee,
            'epf_employer' => $epfEmployer,
            'etf' => $etf,
        ]);

        foreach ($lines as $line) {
            $payslip->items()->create($line);
        }

        return $payslip;
    }

    private function statutory(string $type, string $code, string $label, float $amount, float $base, int $sort): array
    {
        return [
            'type' => $type, 'code' => $code, 'label' => $label, 'amount' => $amount,
            'basis' => 'EPF base '.$this->money($base), 'quantity' => null, 'rate' => null,
            'epf_liable' => false, 'is_manual' => false, 'salary_component_id' => null, 'employee_loan_id' => null, 'sort' => $sort,
        ];
    }

    private function refreshTotals(PayrollRun $run): PayrollRun
    {
        $slips = $run->payslips()->get();
        $run->employee_count = $slips->count();
        $run->gross_total = round($slips->sum('gross_earnings'), 2);
        $run->deduction_total = round($slips->sum('total_deductions'), 2);
        $run->net_total = round($slips->sum('net_pay'), 2);
        $run->epf_employee_total = round($slips->sum('epf_employee'), 2);
        $run->epf_employer_total = round($slips->sum('epf_employer'), 2);
        $run->etf_total = round($slips->sum('etf'), 2);
        $run->save();

        return $run->fresh();
    }

    /**
     * Current structure: the latest effective_from (<= $asOf) per component, active components only.
     */
    public function structure(Employee $employee, string $asOf): Collection
    {
        return EmployeeSalaryComponent::with('component')
            ->where('employee_id', $employee->id)
            ->whereDate('effective_from', '<=', $asOf)
            ->orderBy('effective_from', 'desc')->orderBy('id', 'desc')
            ->get()
            ->unique('salary_component_id')
            ->filter(fn ($line) => $line->component && $line->component->is_active)
            ->sortBy(fn ($line) => [$line->component->type, $line->component->name])
            ->values();
    }

    /**
     * Approved leave per working date (half-day request = 0.5), used so leave days are not counted as absent.
     */
    private function leaveWeights(Employee $employee, string $from, string $to): array
    {
        $weights = [];
        $requests = LeaveRequest::where('employee_id', $employee->id)
            ->where('status', LeaveRequest::STATUS_APPROVED)->overlapping($from, $to)->get();
        foreach ($requests as $request) {
            if ($request->is_half_day) {
                $date = $request->from_date->toDateString();
                if ($date >= $from && $date <= $to) {
                    $weights[$date] = ($weights[$date] ?? 0) + 0.5;
                }

                continue;
            }
            $start = max($from, $request->from_date->toDateString());
            $end = min($to, $request->to_date->toDateString());
            foreach ($this->leave->workingDates($employee, $start, $end) as $date) {
                $day = $this->schedule->forDate($employee, $date);
                $weights[$date] = ($weights[$date] ?? 0) + ($day['is_saturday_half_day'] ? 0.5 : 1.0);
            }
        }

        return $weights;
    }

    /**
     * POS sales commission for the employee's linked login: completed sales (by sales.user_id) in the month.
     * Returns are not subtracted (documented).
     */
    private function commission(Employee $employee, Carbon $month): ?array
    {
        if (! $this->settings()['commission_enabled'] || ! $employee->user_id || ! $employee->commission_percent) {
            return null;
        }
        $sales = (float) Sale::where('user_id', $employee->user_id)
            ->where('status', Sale::COMPLETED)
            ->whereDate('date', '>=', $month->toDateString())
            ->whereDate('date', '<=', $month->copy()->endOfMonth()->toDateString())
            ->sum('grand_total');
        if ($sales <= 0) {
            return null;
        }
        $percent = (float) $employee->commission_percent;

        return ['sales' => round($sales, 2), 'percent' => $percent, 'amount' => round($sales * $percent / 100, 2)];
    }

    private function createSalaryExpense(PayrollRun $run, string $date): Expense
    {
        $category = ExpenseCategory::where('name', 'like', '%salar%')->first()
            ?? ExpenseCategory::create(['name' => 'Salaries']);
        $warehouseId = $run->warehouse_id
            ?: (int) (getSettingValue('default_warehouse') ?: 0)
            ?: Warehouse::query()->value('id');
        if (! $warehouseId) {
            throw new UnprocessableEntityHttpException('Add a warehouse before recording the salary expense.');
        }
        $scope = trim(implode(' / ', array_filter([optional($run->warehouse)->name, optional($run->department)->name])));

        return app(ExpenseRepository::class)->storeExpense([
            'date' => $date,
            'warehouse_id' => $warehouseId,
            'expense_category_id' => $category->id,
            'amount' => $run->net_total,
            'title' => 'Salaries '.$run->month->format('F Y').($scope ? ' ('.$scope.')' : ''),
            'details' => 'Net pay of payroll run #'.$run->id.' ('.$run->employee_count.' employees).',
        ]);
    }

    // ------------------------------------------------------------------ helpers

    public function monthStart(string $month): string
    {
        try {
            return Carbon::createFromFormat('Y-m-d', strlen($month) === 7 ? $month.'-01' : $month)->startOfMonth()->toDateString();
        } catch (\Throwable $e) {
            throw new UnprocessableEntityHttpException('Enter the month as YYYY-MM.');
        }
    }

    private function assertDraft(PayrollRun $run): void
    {
        if ($run->isLocked()) {
            throw new UnprocessableEntityHttpException('This payroll run is '.$run->status.' and can no longer be changed.');
        }
    }

    private function num($value): string
    {
        $value = round((float) $value, 2);

        return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.') ?: '0';
    }

    private function money($value): string
    {
        return number_format((float) $value, 2);
    }
}
