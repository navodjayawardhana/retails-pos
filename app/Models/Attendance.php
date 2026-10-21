<?php

namespace App\Models;

use App\Models\Contracts\JsonResourceful;
use App\Traits\HasJsonResourcefulData;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per employee per date. Computed fields are always set by
 * App\Services\Hrm\AttendanceService — never write them directly.
 *
 * @property int $id
 * @property int $employee_id
 * @property string $status
 * @property int $late_minutes
 * @property int $early_leave_minutes
 * @property int $worked_minutes
 * @property int $ot_minutes
 * @property string $source
 */
class Attendance extends BaseModel implements JsonResourceful
{
    use HasFactory, HasJsonResourcefulData;

    protected $table = 'attendances';

    const JSON_API_TYPE = 'attendances';

    const STATUSES = ['present', 'late', 'half_day', 'absent', 'leave', 'holiday', 'weekend'];

    const SOURCES = ['pos_auto', 'manual', 'device_import', 'self'];

    protected $fillable = [
        'employee_id',
        'date',
        'clock_in',
        'clock_out',
        'status',
        'late_minutes',
        'early_leave_minutes',
        'worked_minutes',
        'ot_minutes',
        'source',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'clock_in' => 'datetime',
        'clock_out' => 'datetime',
        'late_minutes' => 'integer',
        'early_leave_minutes' => 'integer',
        'worked_minutes' => 'integer',
        'ot_minutes' => 'integer',
    ];

    public function prepareLinks(): array
    {
        return [];
    }

    public function prepareAttributes(): array
    {
        $employee = $this->employee;

        return [
            'employee_id' => $this->employee_id,
            'employee_code' => optional($employee)->employee_code,
            'employee_name' => optional($employee)->full_name,
            'branch_name' => $employee && $employee->warehouse ? $employee->warehouse->name : null,
            'department_name' => $employee && $employee->department ? $employee->department->name : null,
            'date' => optional($this->date)->format('Y-m-d'),
            'clock_in' => $this->clock_in ? $this->clock_in->format('H:i') : null,
            'clock_out' => $this->clock_out ? $this->clock_out->format('H:i') : null,
            'clock_in_at' => optional($this->clock_in)->format('Y-m-d H:i'),
            'clock_out_at' => optional($this->clock_out)->format('Y-m-d H:i'),
            'status' => $this->status,
            'late_minutes' => $this->late_minutes,
            'early_leave_minutes' => $this->early_leave_minutes,
            'worked_minutes' => $this->worked_minutes,
            'ot_minutes' => $this->ot_minutes,
            'source' => $this->source,
            'notes' => $this->notes,
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
