<?php

namespace App\Services\Hrm;

use App\Models\Employee;
use App\Models\EmployeeShift;
use App\Models\Holiday;
use App\Models\HrSetting;
use Carbon\Carbon;

/**
 * Resolves what an employee is expected to work on a given date.
 *
 * Fallback order (per docs/hrm-conventions.md): employee override → active shift → hr_settings.
 * Weekly off days: shift.weekly_off_days → hr_settings.weekend_days.
 * Saturday half day (hr_settings.saturday_half_day) applies when Saturday is a working day.
 */
class WorkScheduleService
{
    private ?array $settings = null;

    /** @var array<string, \Illuminate\Support\Collection> */
    private array $holidayCache = [];

    /** @var array<int, \Illuminate\Support\Collection> */
    private array $assignmentCache = [];

    public function settings(): array
    {
        if ($this->settings === null) {
            $this->settings = HrSetting::getAll();
        }

        return $this->settings;
    }

    /**
     * Active shift assignment for the employee on the date (latest from_date wins), or null.
     */
    public function activeShiftAssignment(Employee $employee, string $date): ?EmployeeShift
    {
        if (! isset($this->assignmentCache[$employee->id])) {
            $this->assignmentCache[$employee->id] = EmployeeShift::with('shift')
                ->where('employee_id', $employee->id)
                ->orderByDesc('from_date')
                ->orderByDesc('id')
                ->get();
        }

        return $this->assignmentCache[$employee->id]->first(function (EmployeeShift $assignment) use ($date) {
            $from = $assignment->from_date->format('Y-m-d');
            $to = $assignment->to_date ? $assignment->to_date->format('Y-m-d') : null;

            return $from <= $date && ($to === null || $to >= $date);
        });
    }

    /**
     * Holidays on the date that apply to the employee's branch (null if none).
     */
    public function holidayFor(Employee $employee, string $date): ?Holiday
    {
        $key = $date.'|'.($employee->warehouse_id ?? 0);
        if (! isset($this->holidayCache[$key])) {
            $this->holidayCache[$key] = Holiday::forBranchOn($employee->warehouse_id, $date)->get();
        }

        return $this->holidayCache[$key]->first();
    }

    /**
     * @return array{
     *   date: string, start: string, end: string, start_at: Carbon, end_at: Carbon,
     *   break_minutes: int, grace_minutes: int, half_day_minutes: int, expected_minutes: int,
     *   is_night_shift: bool, is_weekend: bool, is_saturday_half_day: bool,
     *   is_holiday: bool, holiday: ?Holiday, is_working_day: bool,
     *   shift_id: ?int, shift_name: ?string, ot_eligible: bool, ot_multiplier: float,
     *   late_deduction_enabled: bool
     * }
     */
    public function forDate(Employee $employee, string $date): array
    {
        $settings = $this->settings();
        $day = Carbon::parse($date)->startOfDay();
        $assignment = $this->activeShiftAssignment($employee, $day->toDateString());
        $shift = $assignment ? $assignment->shift : null;

        $start = $employee->work_start ? substr($employee->work_start, 0, 5)
            : ($shift ? substr($shift->start_time, 0, 5) : $settings['work_start']);
        $end = $employee->work_end ? substr($employee->work_end, 0, 5)
            : ($shift ? substr($shift->end_time, 0, 5) : $settings['work_end']);

        $breakMinutes = $shift ? (int) $shift->break_minutes : 0;
        $grace = $shift && $shift->late_grace_minutes !== null
            ? (int) $shift->late_grace_minutes : (int) $settings['late_grace_minutes'];
        $halfDayHours = $shift && $shift->half_day_hours !== null
            ? (float) $shift->half_day_hours : (float) $settings['half_day_hours'];
        $offDays = $shift && is_array($shift->weekly_off_days)
            ? array_map('intval', $shift->weekly_off_days) : $settings['weekend_days'];

        $startAt = $day->copy()->setTimeFromTimeString($start);
        $endAt = $day->copy()->setTimeFromTimeString($end);
        $isNight = ($shift && $shift->is_night_shift) || $endAt->lessThanOrEqualTo($startAt);
        if ($endAt->lessThanOrEqualTo($startAt)) {
            $endAt->addDay();
        }

        $isWeekend = in_array($day->dayOfWeek, $offDays, true);
        $isSaturdayHalf = ! $isWeekend && $day->dayOfWeek === Carbon::SATURDAY && $settings['saturday_half_day'];
        if ($isSaturdayHalf) {
            $endAt = $startAt->copy()->addMinutes((int) round($halfDayHours * 60));
            $breakMinutes = 0;
        }

        $holiday = $this->holidayFor($employee, $day->toDateString());
        $expected = max(0, $startAt->diffInMinutes($endAt) - $breakMinutes);

        return [
            'date' => $day->toDateString(),
            'start' => $startAt->format('H:i'),
            'end' => $endAt->format('H:i'),
            'start_at' => $startAt,
            'end_at' => $endAt,
            'break_minutes' => $breakMinutes,
            'grace_minutes' => $grace,
            'half_day_minutes' => (int) round($halfDayHours * 60),
            'expected_minutes' => ($isWeekend || $holiday) ? 0 : $expected,
            'is_night_shift' => $isNight,
            'is_weekend' => $isWeekend,
            'is_saturday_half_day' => $isSaturdayHalf,
            'is_holiday' => (bool) $holiday,
            'holiday' => $holiday,
            'is_working_day' => ! $isWeekend && ! $holiday,
            'shift_id' => $shift ? $shift->id : null,
            'shift_name' => $shift ? $shift->name : null,
            'ot_eligible' => $employee->ot_eligible === null ? true : (bool) $employee->ot_eligible,
            'ot_multiplier' => $employee->ot_rate_multiplier !== null
                ? (float) $employee->ot_rate_multiplier : (float) $settings['ot_multiplier'],
            'late_deduction_enabled' => $employee->late_deduction_enabled !== null
                ? (bool) $employee->late_deduction_enabled : (bool) $settings['late_deduction_enabled'],
        ];
    }

    /**
     * Number of working days (not weekend, not holiday) for the employee in [from, to].
     * Saturday half days count as 0.5. Used by payroll.
     */
    public function workingDays(Employee $employee, string $from, string $to): float
    {
        $days = 0.0;
        $cursor = Carbon::parse($from)->startOfDay();
        $last = Carbon::parse($to)->startOfDay();
        while ($cursor->lessThanOrEqualTo($last)) {
            $schedule = $this->forDate($employee, $cursor->toDateString());
            if ($schedule['is_working_day']) {
                $days += $schedule['is_saturday_half_day'] ? 0.5 : 1;
            }
            $cursor->addDay();
        }

        return $days;
    }
}
