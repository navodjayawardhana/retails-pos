<?php

namespace App\Models;

use App\Models\Contracts\JsonResourceful;
use App\Traits\HasJsonResourcefulData;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property string $start_time
 * @property string $end_time
 * @property int $break_minutes
 * @property int|null $late_grace_minutes
 * @property float|null $half_day_hours
 * @property bool $is_night_shift
 * @property array|null $weekly_off_days
 */
class Shift extends BaseModel implements JsonResourceful
{
    use HasFactory, HasJsonResourcefulData;

    protected $table = 'shifts';

    const JSON_API_TYPE = 'shifts';

    protected $fillable = [
        'name',
        'start_time',
        'end_time',
        'break_minutes',
        'late_grace_minutes',
        'half_day_hours',
        'is_night_shift',
        'weekly_off_days',
        'description',
    ];

    protected $casts = [
        'break_minutes' => 'integer',
        'late_grace_minutes' => 'integer',
        'half_day_hours' => 'float',
        'is_night_shift' => 'boolean',
        'weekly_off_days' => 'array',
    ];

    public static $rules = [
        'name' => 'required|max:191|unique:shifts',
        'start_time' => 'required|date_format:H:i',
        'end_time' => 'required|date_format:H:i',
        'break_minutes' => 'nullable|integer|min:0|max:600',
        'late_grace_minutes' => 'nullable|integer|min:0|max:240',
        'half_day_hours' => 'nullable|numeric|min:0|max:24',
        'is_night_shift' => 'nullable|boolean',
        'weekly_off_days' => 'nullable|array',
        'weekly_off_days.*' => 'integer|min:0|max:6',
        'description' => 'nullable|max:1000',
    ];

    public function prepareLinks(): array
    {
        return [
            'self' => route('shifts.show', $this->id),
        ];
    }

    public function prepareAttributes(): array
    {
        $today = HrSetting::today();

        return [
            'name' => $this->name,
            'start_time' => substr($this->start_time, 0, 5),
            'end_time' => substr($this->end_time, 0, 5),
            'break_minutes' => $this->break_minutes,
            'late_grace_minutes' => $this->late_grace_minutes,
            'half_day_hours' => $this->half_day_hours,
            'is_night_shift' => $this->is_night_shift,
            'weekly_off_days' => $this->weekly_off_days,
            'description' => $this->description,
            'employees_count' => $this->employeeShifts()
                ->whereDate('from_date', '<=', $today)
                ->where(function ($q) use ($today) {
                    $q->whereNull('to_date')->orWhereDate('to_date', '>=', $today);
                })
                ->distinct()
                ->count('employee_id'),
            'created_at' => $this->created_at,
        ];
    }

    public function employeeShifts(): HasMany
    {
        return $this->hasMany(EmployeeShift::class);
    }
}
