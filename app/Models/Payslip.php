<?php

namespace App\Models;

use App\Models\Contracts\JsonResourceful;
use App\Traits\HasJsonResourcefulData;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Payslip with a snapshot of the employee and every line stored with its basis.
 *
 * @property int $id
 * @property int $payroll_run_id
 * @property int $employee_id
 * @property \Carbon\Carbon $month
 */
class Payslip extends BaseModel implements JsonResourceful
{
    use HasFactory, HasJsonResourcefulData;

    protected $table = 'payslips';

    const JSON_API_TYPE = 'payslips';

    protected $fillable = [
        'payroll_run_id',
        'employee_id',
        'month',
        'employee_code',
        'employee_name',
        'designation_name',
        'department_name',
        'branch_name',
        'salary_type',
        'basic_salary',
        'nic',
        'epf_no',
        'bank_name',
        'bank_branch',
        'bank_account_no',
        'working_days',
        'payable_days',
        'absent_days',
        'unpaid_leave_days',
        'paid_leave_days',
        'ot_hours',
        'late_minutes',
        'gross_earnings',
        'total_deductions',
        'net_pay',
        'epf_base',
        'epf_employee',
        'epf_employer',
        'etf',
        'notes',
    ];

    protected $casts = [
        'month' => 'date:Y-m-d',
        'basic_salary' => 'float',
        'working_days' => 'float',
        'payable_days' => 'float',
        'absent_days' => 'float',
        'unpaid_leave_days' => 'float',
        'paid_leave_days' => 'float',
        'ot_hours' => 'float',
        'late_minutes' => 'integer',
        'gross_earnings' => 'float',
        'total_deductions' => 'float',
        'net_pay' => 'float',
        'epf_base' => 'float',
        'epf_employee' => 'float',
        'epf_employer' => 'float',
        'etf' => 'float',
    ];

    public function prepareLinks(): array
    {
        return [
            'self' => route('payslips.show', $this->id),
        ];
    }

    public function prepareAttributes(): array
    {
        $run = $this->payrollRun;

        return [
            'payroll_run_id' => $this->payroll_run_id,
            'run_status' => $run ? $run->status : null,
            'employee_id' => $this->employee_id,
            'month' => $this->month->format('Y-m'),
            'month_label' => $this->month->format('F Y'),
            'employee_code' => $this->employee_code,
            'employee_name' => $this->employee_name,
            'designation_name' => $this->designation_name,
            'department_name' => $this->department_name,
            'branch_name' => $this->branch_name,
            'salary_type' => $this->salary_type,
            'basic_salary' => $this->basic_salary,
            'nic' => $this->nic,
            'epf_no' => $this->epf_no,
            'bank_name' => $this->bank_name,
            'bank_branch' => $this->bank_branch,
            'bank_account_no' => $this->bank_account_no,
            'working_days' => $this->working_days,
            'payable_days' => $this->payable_days,
            'absent_days' => $this->absent_days,
            'unpaid_leave_days' => $this->unpaid_leave_days,
            'paid_leave_days' => $this->paid_leave_days,
            'ot_hours' => $this->ot_hours,
            'late_minutes' => $this->late_minutes,
            'gross_earnings' => $this->gross_earnings,
            'total_deductions' => $this->total_deductions,
            'net_pay' => $this->net_pay,
            'epf_base' => $this->epf_base,
            'epf_employee' => $this->epf_employee,
            'epf_employer' => $this->epf_employer,
            'etf' => $this->etf,
            'notes' => $this->notes,
            'items' => $this->items()->orderBy('sort')->orderBy('id')->get()->map(fn (PayslipItem $i) => $i->toPayload())->values(),
            'created_at' => $this->created_at,
        ];
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PayslipItem::class);
    }
}
