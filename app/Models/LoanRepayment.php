<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $employee_loan_id
 * @property int|null $payroll_run_id
 * @property int|null $payslip_id
 * @property float $amount
 * @property \Carbon\Carbon $date
 * @property string $type payroll|manual
 */
class LoanRepayment extends Model
{
    protected $table = 'loan_repayments';

    protected $fillable = [
        'employee_loan_id',
        'payroll_run_id',
        'payslip_id',
        'amount',
        'date',
        'type',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'float',
        'date' => 'date:Y-m-d',
    ];

    public function loan(): BelongsTo
    {
        return $this->belongsTo(EmployeeLoan::class, 'employee_loan_id');
    }
}
