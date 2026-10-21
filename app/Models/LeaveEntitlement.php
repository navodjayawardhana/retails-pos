<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $employee_id
 * @property int $leave_type_id
 * @property int $year
 * @property float $days
 * @property float $carried_forward
 * @property bool $is_custom
 */
class LeaveEntitlement extends Model
{
    protected $table = 'leave_entitlements';

    protected $fillable = [
        'employee_id',
        'leave_type_id',
        'year',
        'days',
        'carried_forward',
        'is_custom',
        'notes',
    ];

    protected $casts = [
        'year' => 'integer',
        'days' => 'float',
        'carried_forward' => 'float',
        'is_custom' => 'boolean',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function getTotalAttribute(): float
    {
        return (float) $this->days + (float) $this->carried_forward;
    }
}
