<?php

namespace App\Models;

use App\Models\Contracts\JsonResourceful;
use App\Traits\HasJsonResourcefulData;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $employee_id
 * @property string $type advance|loan
 * @property float $amount
 * @property int $installments
 * @property float $monthly_installment
 * @property \Carbon\Carbon $issued_date
 * @property \Carbon\Carbon $start_month
 * @property float $balance
 * @property string $status active|completed|cancelled
 */
class EmployeeLoan extends BaseModel implements JsonResourceful
{
    use HasFactory, HasJsonResourcefulData;

    protected $table = 'employee_loans';

    const JSON_API_TYPE = 'employee_loans';

    const STATUS_ACTIVE = 'active';

    const STATUS_COMPLETED = 'completed';

    const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'employee_id',
        'type',
        'amount',
        'installments',
        'monthly_installment',
        'issued_date',
        'start_month',
        'balance',
        'status',
        'reason',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'float',
        'installments' => 'integer',
        'monthly_installment' => 'float',
        'balance' => 'float',
        'issued_date' => 'date:Y-m-d',
        'start_month' => 'date:Y-m-d',
    ];

    public function prepareLinks(): array
    {
        return [
            'self' => route('employee-loans.show', $this->id),
        ];
    }

    public function prepareAttributes(): array
    {
        $employee = $this->employee;

        return [
            'employee_id' => $this->employee_id,
            'employee_code' => $employee ? $employee->employee_code : null,
            'employee_name' => $employee ? $employee->full_name : null,
            'branch_name' => $employee && $employee->warehouse ? $employee->warehouse->name : null,
            'type' => $this->type,
            'amount' => $this->amount,
            'installments' => $this->installments,
            'monthly_installment' => $this->monthly_installment,
            'issued_date' => optional($this->issued_date)->format('Y-m-d'),
            'start_month' => optional($this->start_month)->format('Y-m'),
            'balance' => $this->balance,
            'paid' => round($this->amount - $this->balance, 2),
            'status' => $this->status,
            'reason' => $this->reason,
            'repayments' => $this->repayments()->orderBy('date')->get()->map(fn (LoanRepayment $r) => [
                'id' => $r->id,
                'amount' => $r->amount,
                'date' => $r->date->format('Y-m-d'),
                'type' => $r->type,
                'payroll_run_id' => $r->payroll_run_id,
                'notes' => $r->notes,
            ])->values(),
            'created_at' => $this->created_at,
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function repayments(): HasMany
    {
        return $this->hasMany(LoanRepayment::class);
    }

    /**
     * What payroll should deduct this month (never more than the balance).
     */
    public function installmentFor(string $monthStart): float
    {
        if ($this->status !== self::STATUS_ACTIVE || $this->balance <= 0) {
            return 0.0;
        }
        if ($this->start_month->format('Y-m-d') > $monthStart) {
            return 0.0;
        }

        return round(min($this->monthly_installment, $this->balance), 2);
    }
}
