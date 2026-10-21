<?php

namespace App\Models;

use App\Models\Contracts\JsonResourceful;
use App\Traits\HasJsonResourcefulData;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property \Carbon\Carbon $month first day of the month
 * @property int|null $warehouse_id
 * @property int|null $department_id
 * @property string $status draft|approved|paid
 */
class PayrollRun extends BaseModel implements JsonResourceful
{
    use HasFactory, HasJsonResourcefulData;

    protected $table = 'payroll_runs';

    const JSON_API_TYPE = 'payroll_runs';

    const STATUS_DRAFT = 'draft';

    const STATUS_APPROVED = 'approved';

    const STATUS_PAID = 'paid';

    protected $fillable = [
        'month',
        'warehouse_id',
        'department_id',
        'status',
        'employee_count',
        'gross_total',
        'deduction_total',
        'net_total',
        'epf_employee_total',
        'epf_employer_total',
        'etf_total',
        'notes',
        'skipped',
        'created_by',
        'approved_by',
        'approved_at',
        'paid_by',
        'paid_at',
        'expense_id',
    ];

    protected $casts = [
        'month' => 'date:Y-m-d',
        'gross_total' => 'float',
        'deduction_total' => 'float',
        'net_total' => 'float',
        'epf_employee_total' => 'float',
        'epf_employer_total' => 'float',
        'etf_total' => 'float',
        'skipped' => 'array',
        'approved_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function prepareLinks(): array
    {
        return [
            'self' => route('payroll-runs.show', $this->id),
        ];
    }

    public function prepareAttributes(): array
    {
        return [
            'month' => $this->month->format('Y-m'),
            'month_label' => $this->month->format('F Y'),
            'warehouse_id' => $this->warehouse_id,
            'branch_name' => $this->warehouse ? $this->warehouse->name : null,
            'department_id' => $this->department_id,
            'department_name' => $this->department ? $this->department->name : null,
            'status' => $this->status,
            'employee_count' => $this->employee_count,
            'gross_total' => $this->gross_total,
            'deduction_total' => $this->deduction_total,
            'net_total' => $this->net_total,
            'epf_employee_total' => $this->epf_employee_total,
            'epf_employer_total' => $this->epf_employer_total,
            'etf_total' => $this->etf_total,
            'notes' => $this->notes,
            'skipped' => $this->skipped ?: [],
            'approved_by_name' => $this->approver ? trim($this->approver->first_name.' '.$this->approver->last_name) : null,
            'approved_at' => $this->approved_at,
            'paid_at' => $this->paid_at,
            'expense_id' => $this->expense_id,
            'created_at' => $this->created_at,
        ];
    }

    public function isLocked(): bool
    {
        return $this->status !== self::STATUS_DRAFT;
    }

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
