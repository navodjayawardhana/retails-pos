<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $payslip_id
 * @property string $type earning|deduction|employer
 * @property string $code
 * @property string $label
 * @property float|null $quantity
 * @property float|null $rate
 * @property float $amount
 * @property string|null $basis
 * @property bool $epf_liable
 * @property bool $is_manual
 */
class PayslipItem extends Model
{
    protected $table = 'payslip_items';

    const TYPE_EARNING = 'earning';

    const TYPE_DEDUCTION = 'deduction';

    const TYPE_EMPLOYER = 'employer';

    protected $fillable = [
        'payslip_id',
        'type',
        'code',
        'label',
        'quantity',
        'rate',
        'amount',
        'basis',
        'epf_liable',
        'is_manual',
        'salary_component_id',
        'employee_loan_id',
        'sort',
    ];

    protected $casts = [
        'quantity' => 'float',
        'rate' => 'float',
        'amount' => 'float',
        'epf_liable' => 'boolean',
        'is_manual' => 'boolean',
    ];

    public function payslip(): BelongsTo
    {
        return $this->belongsTo(Payslip::class);
    }

    public function toPayload(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'code' => $this->code,
            'label' => $this->label,
            'quantity' => $this->quantity,
            'rate' => $this->rate,
            'amount' => $this->amount,
            'basis' => $this->basis,
            'epf_liable' => $this->epf_liable,
            'is_manual' => $this->is_manual,
        ];
    }
}
