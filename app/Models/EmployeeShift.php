<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Shift assignment with effective dates. to_date null = open ended.
 *
 * @property int $id
 * @property int $employee_id
 * @property int $shift_id
 */
class EmployeeShift extends Model
{
    protected $table = 'employee_shifts';

    protected $fillable = [
        'employee_id',
        'shift_id',
        'from_date',
        'to_date',
    ];

    protected $casts = [
        'from_date' => 'date:Y-m-d',
        'to_date' => 'date:Y-m-d',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'employee_id' => $this->employee_id,
            'employee_name' => optional($this->employee)->full_name,
            'employee_code' => optional($this->employee)->employee_code,
            'shift_id' => $this->shift_id,
            'shift_name' => optional($this->shift)->name,
            'start_time' => $this->shift ? substr($this->shift->start_time, 0, 5) : null,
            'end_time' => $this->shift ? substr($this->shift->end_time, 0, 5) : null,
            'from_date' => optional($this->from_date)->format('Y-m-d'),
            'to_date' => optional($this->to_date)->format('Y-m-d'),
        ];
    }
}
