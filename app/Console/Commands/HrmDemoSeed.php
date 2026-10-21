<?php

namespace App\Console\Commands;

use App\Models\Attendance;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\EmployeeSalaryComponent;
use App\Models\EmployeeShift;
use App\Models\Holiday;
use App\Models\HrSetting;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\PayrollRun;
use App\Models\SalaryComponent;
use App\Models\Shift;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\Hrm\AttendanceService;
use App\Services\Hrm\LeaveService;
use App\Services\Hrm\PayrollService;
use App\Services\Hrm\WorkScheduleService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Demo HR data so the HRM screens have something to show.
 * Everything it creates is tagged so --fresh can remove only that:
 *   employees: employee_code "DEMO-###"; departments/designations/shifts: description "[demo]";
 *   holidays: name ends " (demo)"; payroll run: notes "[demo]".
 */
class HrmDemoSeed extends Command
{
    protected $signature = 'hrm:demo-seed {--fresh : Remove the demo HR data this command created and stop}';

    protected $description = 'Create (or remove) Sri Lankan demo HR data: employees, attendance, leave and a payroll run';

    const TAG = '[demo]';

    public function handle(AttendanceService $attendance, LeaveService $leave, PayrollService $payroll, WorkScheduleService $schedule): int
    {
        if ($this->option('fresh')) {
            $this->removeDemo();
            $this->info('Demo HR data removed.');

            return self::SUCCESS;
        }

        if (Employee::where('employee_code', 'like', 'DEMO-%')->exists()) {
            $this->warn('Demo HR data already exists. Run with --fresh first to recreate it.');

            return self::SUCCESS;
        }

        mt_srand(20261021);
        $adminId = optional(User::orderBy('id')->first())->id;
        $branches = Warehouse::orderBy('id')->pluck('id')->all();
        if (! $branches) {
            $this->error('No branches (warehouses) found.');

            return self::FAILURE;
        }

        $today = Carbon::parse(HrSetting::today());
        $prevMonth = $today->copy()->startOfMonth()->subMonth();

        DB::transaction(function () use ($branches, $today, $prevMonth, $attendance, $leave, $schedule, $adminId) {
            [$departments, $designations] = $this->structure();
            $shifts = $this->shifts();
            $this->holidays($prevMonth, $today, $branches);
            $employees = $this->employees($departments, $designations, $branches, $prevMonth);
            $this->assignShifts($employees, $shifts, $prevMonth);
            $this->salaryStructure($employees, $prevMonth);
            $this->loans($employees, $prevMonth, $adminId);

            $leave->initialiseYear((int) $today->year, $employees->pluck('id')->all());
            $this->leaveRequests($employees, $leave, $prevMonth, $today, $adminId);

            $this->attendance($employees, $attendance, $schedule, $prevMonth, $today, $adminId);
        });

        // payroll for last month, calculated and approved (not paid)
        $run = $payroll->createRun(['month' => $prevMonth->format('Y-m'), 'notes' => self::TAG], $adminId);
        $payroll->approve($run->fresh(), $adminId);

        $this->info('Demo HR data created: '.Employee::where('employee_code', 'like', 'DEMO-%')->count().' employees, '
            .Attendance::whereHas('employee', fn ($q) => $q->where('employee_code', 'like', 'DEMO-%'))->count().' attendance rows, '
            .LeaveRequest::whereHas('employee', fn ($q) => $q->where('employee_code', 'like', 'DEMO-%'))->count().' leave requests, '
            .'payroll run '.$prevMonth->format('Y-m').' approved.');

        return self::SUCCESS;
    }

    private function structure(): array
    {
        $deptDefs = [
            'Sales & Cashiering' => ['Cashier', 'Sales Assistant'],
            'Store & Inventory' => ['Storekeeper', 'Stock Assistant'],
            'Administration' => ['Store Manager', 'Assistant Manager'],
            'Delivery' => ['Driver', 'Delivery Helper'],
        ];
        $departments = [];
        $designations = [];
        foreach ($deptDefs as $deptName => $titles) {
            $dept = Department::firstOrCreate(['name' => $deptName], ['description' => self::TAG]);
            $departments[$deptName] = $dept;
            foreach ($titles as $title) {
                $designations[$title] = Designation::firstOrCreate(
                    ['name' => $title, 'department_id' => $dept->id],
                    ['description' => self::TAG]
                );
            }
        }

        return [$departments, $designations];
    }

    private function shifts(): array
    {
        return [
            'day' => Shift::firstOrCreate(['name' => 'Day Shift (demo)'], [
                'start_time' => '08:30', 'end_time' => '17:30', 'break_minutes' => 60,
                'late_grace_minutes' => 15, 'description' => self::TAG,
            ]),
            'late' => Shift::firstOrCreate(['name' => 'Late Shift (demo)'], [
                'start_time' => '11:00', 'end_time' => '20:00', 'break_minutes' => 60,
                'late_grace_minutes' => 15, 'description' => self::TAG,
            ]),
        ];
    }

    private function holidays(Carbon $prevMonth, Carbon $today, array $branches): void
    {
        // Poya dates are approximate full-moon days, for demo only.
        $poya = [
            '2026-09-26' => 'Binara Full Moon Poya Day',
            '2026-10-26' => 'Vap Full Moon Poya Day',
        ];
        foreach ($poya as $date => $name) {
            $d = Carbon::parse($date);
            if ($d->lt($prevMonth) || $d->gt($today->copy()->endOfMonth())) {
                continue;
            }
            Holiday::firstOrCreate(['name' => $name.' (demo)', 'date' => $date, 'warehouse_id' => null],
                ['type' => 'poya', 'is_paid' => true]);
        }
    }

    private function employees(array $departments, array $designations, array $branches, Carbon $prevMonth)
    {
        // [first, last, gender, department, designation, salary_type, basic, epf_applicable, ot_eligible]
        $people = [
            ['Nimal', 'Perera', 'male', 'Administration', 'Store Manager', 'monthly', 145000, true, false],
            ['Dilani', 'Fernando', 'female', 'Administration', 'Assistant Manager', 'monthly', 98000, true, false],
            ['Kasun', 'Jayasinghe', 'male', 'Sales & Cashiering', 'Cashier', 'monthly', 52000, true, true],
            ['Sanduni', 'Wickramasinghe', 'female', 'Sales & Cashiering', 'Cashier', 'monthly', 50000, true, true],
            ['Mohamed', 'Rizwan', 'male', 'Sales & Cashiering', 'Cashier', 'monthly', 51000, true, true],
            ['Priya', 'Rajendran', 'female', 'Sales & Cashiering', 'Sales Assistant', 'monthly', 42000, true, true],
            ['Tharushi', 'Gunawardena', 'female', 'Sales & Cashiering', 'Sales Assistant', 'monthly', 40000, true, true],
            ['Fathima', 'Nazeera', 'female', 'Sales & Cashiering', 'Sales Assistant', 'monthly', 41000, true, true],
            ['Chaminda', 'Bandara', 'male', 'Store & Inventory', 'Storekeeper', 'monthly', 60000, true, true],
            ['Arjun', 'Sivakumar', 'male', 'Store & Inventory', 'Stock Assistant', 'monthly', 45000, true, true],
            ['Ruwan', 'Silva', 'male', 'Delivery', 'Driver', 'monthly', 55000, true, true],
            ['Ahamed', 'Rifkhan', 'male', 'Delivery', 'Delivery Helper', 'daily', 2800, false, true],
            ['Lahiru', 'Rathnayake', 'male', 'Store & Inventory', 'Stock Assistant', 'daily', 2500, false, true],
            ['Kavitha', 'Thevarajah', 'female', 'Sales & Cashiering', 'Sales Assistant', 'daily', 2400, true, true],
            ['Pradeep', 'Kumara', 'male', 'Delivery', 'Driver', 'monthly', 57000, true, true],
        ];
        $banks = ['Bank of Ceylon', 'Commercial Bank', 'Sampath Bank', "People's Bank", 'HNB'];
        $cities = ['Colombo', 'Dehiwala', 'Nugegoda', 'Maharagama', 'Kelaniya', 'Wattala', 'Moratuwa'];

        $employees = collect();
        foreach ($people as $i => $p) {
            [$first, $last, $gender, $dept, $title, $salaryType, $basic, $epf, $ot] = $p;
            $n = $i + 1;
            $birthYear = 1975 + ($n * 7) % 25;
            $employees->push(Employee::create([
                'employee_code' => sprintf('DEMO-%03d', $n),
                'first_name' => $first,
                'last_name' => $last,
                'nic' => sprintf('%d%07dV', $birthYear % 100, 1000000 + $n * 7919 % 9000000),
                'dob' => sprintf('%d-%02d-%02d', $birthYear, ($n % 12) + 1, ($n * 3 % 27) + 1),
                'gender' => $gender,
                'phone' => sprintf('07%d%07d', [0, 1, 2, 5, 6, 7, 8][$n % 7], 1000000 + $n * 104729 % 9000000),
                'email' => strtolower($first.'.'.$last).'@demo.lk',
                'address' => (10 + $n).', Temple Road',
                'city' => $cities[$n % count($cities)],
                'warehouse_id' => $branches[$i % count($branches)],
                'department_id' => $departments[$dept]->id,
                'designation_id' => $designations[$title]->id,
                'joining_date' => $prevMonth->copy()->subMonths(6 + ($n * 5) % 40)->startOfMonth()->addDays($n % 20)->toDateString(),
                'employment_type' => $salaryType === 'daily' ? 'daily' : ($n === 7 ? 'probation' : 'permanent'),
                'salary_type' => $salaryType,
                'basic_salary' => $basic,
                'ot_eligible' => $ot,
                'epf_applicable' => $epf,
                'bank_name' => $banks[$n % count($banks)],
                'bank_branch' => $cities[($n + 2) % count($cities)],
                'bank_account_no' => (string) (8000000000 + $n * 1234567),
                'epf_no' => $epf ? (string) (1000 + $n) : null,
                'emergency_contact_name' => 'Family contact',
                'emergency_contact_phone' => sprintf('077%07d', 2000000 + $n * 31337 % 7000000),
                'status' => 'active',
                'notes' => self::TAG.' Demo employee created by php artisan hrm:demo-seed',
            ]));
        }

        return $employees;
    }

    private function assignShifts($employees, array $shifts, Carbon $prevMonth): void
    {
        foreach ($employees as $i => $employee) {
            EmployeeShift::create([
                'employee_id' => $employee->id,
                'shift_id' => ($i % 5 === 4) ? $shifts['late']->id : $shifts['day']->id,
                'from_date' => $prevMonth->toDateString(),
                'to_date' => null,
            ]);
        }
    }

    private function salaryStructure($employees, Carbon $prevMonth): void
    {
        $components = SalaryComponent::pluck('id', 'code');
        foreach ($employees as $employee) {
            if ($employee->salary_type === 'daily') {
                continue;
            }
            $items = [
                'FXA' => $employee->basic_salary >= 90000 ? 10000 : 3000,
                'TRA' => in_array($employee->employee_code, ['DEMO-011', 'DEMO-015']) ? 6000 : 3500,
                'MEA' => 2000,
                'WEL' => 200,
            ];
            foreach ($items as $code => $value) {
                if (! isset($components[$code])) {
                    continue;
                }
                EmployeeSalaryComponent::create([
                    'employee_id' => $employee->id,
                    'salary_component_id' => $components[$code],
                    'value' => $value,
                    'effective_from' => $prevMonth->toDateString(),
                ]);
            }
        }
    }

    private function loans($employees, Carbon $prevMonth, ?int $adminId): void
    {
        $defs = [
            ['DEMO-003', 'loan', 30000, 6, 'Festival loan'],
            ['DEMO-011', 'advance', 10000, 2, 'Salary advance'],
        ];
        foreach ($defs as [$code, $type, $amount, $installments, $reason]) {
            $employee = $employees->firstWhere('employee_code', $code);
            if (! $employee) {
                continue;
            }
            EmployeeLoan::create([
                'employee_id' => $employee->id,
                'type' => $type,
                'amount' => $amount,
                'installments' => $installments,
                'monthly_installment' => round($amount / $installments, 2),
                'issued_date' => $prevMonth->copy()->subDays(5)->toDateString(),
                'start_month' => $prevMonth->toDateString(),
                'balance' => $amount,
                'status' => EmployeeLoan::STATUS_ACTIVE,
                'reason' => $reason,
                'created_by' => $adminId,
            ]);
        }
    }

    private function leaveRequests($employees, LeaveService $leave, Carbon $prevMonth, Carbon $today, ?int $adminId): void
    {
        $types = LeaveType::pluck('id', 'code');
        $workingDay = function (Carbon $d) {
            while ($d->isSunday()) {
                $d->addDay();
            }

            return $d;
        };
        // [employee, type, start (days from prev-month start or from today with +), length, outcome]
        $defs = [
            ['DEMO-004', 'AL', $prevMonth->copy()->addDays(9), 2, 'approved'],
            ['DEMO-006', 'CL', $prevMonth->copy()->addDays(15), 1, 'approved'],
            ['DEMO-009', 'NP', $prevMonth->copy()->addDays(20), 2, 'approved'],
            ['DEMO-010', 'CL', $today->copy()->subDays(12), 1, 'approved'],
            ['DEMO-002', 'AL', $today->copy()->subDays(1), 1, 'approved'],
            ['DEMO-005', 'AL', $today->copy()->addDays(3), 3, 'approved'],
            ['DEMO-007', 'CL', $today->copy()->addDays(2), 1, 'pending'],
            ['DEMO-003', 'AL', $today->copy()->addDays(8), 2, 'pending'],
            ['DEMO-008', 'CL', $today->copy()->subDays(6), 1, 'rejected'],
            ['DEMO-015', 'AL', $today->copy()->addDays(5), 2, 'pending'],
        ];
        foreach ($defs as [$code, $typeCode, $start, $length, $outcome]) {
            $employee = $employees->firstWhere('employee_code', $code);
            if (! $employee || ! isset($types[$typeCode])) {
                continue;
            }
            $from = $workingDay($start->copy());
            $to = $from->copy();
            for ($k = 1; $k < $length; $k++) {
                $to = $workingDay($to->copy()->addDay());
            }
            try {
                $request = $leave->apply([
                    'employee_id' => $employee->id,
                    'leave_type_id' => $types[$typeCode],
                    'from_date' => $from->toDateString(),
                    'to_date' => $to->toDateString(),
                    'is_half_day' => false,
                    'reason' => $typeCode === 'NP' ? 'Personal matter' : 'Family function',
                ], $adminId);
                if ($outcome === 'approved') {
                    $leave->approve($request, $adminId, 'Approved');
                } elseif ($outcome === 'rejected') {
                    $leave->reject($request, $adminId, 'Busy period');
                }
            } catch (\Throwable $e) {
                $this->warn("Leave for {$code} skipped: ".$e->getMessage());
            }
        }
    }

    private function attendance($employees, AttendanceService $attendance, WorkScheduleService $schedule, Carbon $prevMonth, Carbon $today, ?int $adminId): void
    {
        $now = HrSetting::now();
        foreach ($employees as $index => $employee) {
            $existing = Attendance::where('employee_id', $employee->id)->pluck('date')
                ->map(fn ($d) => Carbon::parse($d)->toDateString())->flip();

            for ($date = $prevMonth->copy(); $date->lte($today); $date->addDay()) {
                $ds = $date->toDateString();
                if (isset($existing[$ds])) {
                    continue; // e.g. approved leave
                }
                $day = $schedule->forDate($employee, $ds);
                if (! $day['is_working_day']) {
                    continue;
                }

                $roll = mt_rand(1, 100);
                // a couple of staff are less punctual
                $lateBias = in_array($index, [5, 10]) ? 15 : 0;
                if ($roll <= 3) {
                    $attendance->record($employee, $ds, null, null, 'manual', 'absent', 'Demo', $adminId);
                    continue;
                }

                $start = $day['start_at']->copy();
                $end = $day['end_at']->copy();
                $in = $roll <= 10 + $lateBias
                    ? $start->copy()->addMinutes(mt_rand(20, 55))
                    : $start->copy()->subMinutes(mt_rand(0, 20))->addMinutes(mt_rand(0, 12));
                $out = $end->copy()->addMinutes(mt_rand(0, 15));
                if ($employee->ot_eligible && mt_rand(1, 100) <= 22) {
                    $out = $end->copy()->addMinutes(mt_rand(45, 150));
                }

                if ($ds === $today->toDateString()) {
                    if ($now->lt($in)) {
                        continue; // not in yet
                    }
                    $attendance->record($employee, $ds, $in->format('Y-m-d H:i'), null, 'pos_auto', null, null, $adminId);
                    continue;
                }

                $source = mt_rand(1, 100) <= 60 ? 'pos_auto' : 'device_import';
                $attendance->record($employee, $ds, $in->format('Y-m-d H:i'), $out->format('Y-m-d H:i'), $source, null, null, $adminId);
            }
        }
    }

    private function removeDemo(): void
    {
        DB::transaction(function () {
            $runIds = PayrollRun::where('notes', self::TAG)->pluck('id');
            if ($runIds->isNotEmpty()) {
                $payslipIds = DB::table('payslips')->whereIn('payroll_run_id', $runIds)->pluck('id');
                DB::table('loan_repayments')->whereIn('payslip_id', $payslipIds)->delete();
                DB::table('payslip_items')->whereIn('payslip_id', $payslipIds)->delete();
                DB::table('payslips')->whereIn('id', $payslipIds)->delete();
                PayrollRun::whereIn('id', $runIds)->delete();
            }

            $employees = Employee::where('employee_code', 'like', 'DEMO-%')->get();
            foreach ($employees as $employee) {
                LeaveRequest::where('employee_id', $employee->id)->get()->each(function ($request) {
                    $request->clearMediaCollection(LeaveRequest::ATTACHMENT_PATH);
                    $request->delete();
                });
                EmployeeShift::where('employee_id', $employee->id)->delete();
                $employee->clearMediaCollection(Employee::PHOTO_PATH);
                $employee->clearMediaCollection(Employee::DOCUMENT_PATH);
                $employee->delete(); // attendance, entitlements, salary structure, loans, payslips cascade
            }

            Holiday::where('name', 'like', '% (demo)')->delete();
            Shift::where('description', self::TAG)->whereDoesntHave('employeeShifts')->delete();
            Designation::where('description', self::TAG)
                ->whereNotIn('id', Employee::whereNotNull('designation_id')->pluck('designation_id'))->delete();
            Department::where('description', self::TAG)
                ->whereNotIn('id', Employee::whereNotNull('department_id')->pluck('department_id'))
                ->whereNotIn('id', Designation::whereNotNull('department_id')->pluck('department_id'))->delete();
        });
    }
}
