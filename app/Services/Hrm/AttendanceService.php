<?php

namespace App\Services\Hrm;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrSetting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

/**
 * The single place attendance is calculated and written. Every entry path
 * (POS auto, manual, device import, self service, leave) goes through record().
 */
class AttendanceService
{
    public const DAY_CODES = [
        'present' => 'P',
        'late' => 'L',
        'half_day' => 'HD',
        'absent' => 'A',
        'leave' => 'LV',
        'holiday' => 'H',
        'weekend' => 'W',
        'unmarked' => '-',
    ];

    private WorkScheduleService $schedule;

    public function __construct(WorkScheduleService $schedule)
    {
        $this->schedule = $schedule;
    }

    public function schedule(): WorkScheduleService
    {
        return $this->schedule;
    }

    /**
     * Parse a time ("08:30", "8:30 AM", "08:30:00") or datetime ("2026-10-21 08:30") for a date.
     */
    public function parseTime(?string $value, string $date): ?Carbon
    {
        $value = $value === null ? null : trim($value);
        if ($value === null || $value === '') {
            return null;
        }
        try {
            if (preg_match('/^\d{4}-\d{2}-\d{2}[ T]/', $value)) {
                return Carbon::parse($value)->second(0);
            }

            return Carbon::parse($date.' '.$value)->second(0);
        } catch (\Throwable $e) {
            throw new UnprocessableEntityHttpException("Invalid time \"{$value}\".");
        }
    }

    /**
     * Compute status/late/early/worked/OT for an employee on a date.
     *
     * @param  string|null  $forcedStatus  leave|absent|holiday|weekend|half_day to override the computed status
     */
    public function calculate(Employee $employee, string $date, ?Carbon $in, ?Carbon $out, ?string $forcedStatus = null): array
    {
        $s = $this->schedule->forDate($employee, $date);

        // a clock-out at/before clock-in belongs to the next day (night work)
        if ($in && $out && $out->lessThanOrEqualTo($in)) {
            $out = $out->copy()->addDay();
        }

        $late = 0;
        $early = 0;
        $worked = 0;
        $ot = 0;

        if ($in && $s['is_working_day']) {
            $lateRaw = $in->greaterThan($s['start_at']) ? $s['start_at']->diffInMinutes($in) : 0;
            $late = $lateRaw > $s['grace_minutes'] ? $lateRaw : 0;
        }

        if ($in && $out) {
            $gross = $in->diffInMinutes($out);
            $worked = max(0, $gross - ($gross > $s['half_day_minutes'] ? $s['break_minutes'] : 0));
            if ($s['is_working_day']) {
                $early = $out->lessThan($s['end_at']) ? $out->diffInMinutes($s['end_at']) : 0;
                $ot = $s['ot_eligible'] && $out->greaterThan($s['end_at']) ? $s['end_at']->diffInMinutes($out) : 0;
            } else {
                $ot = $s['ot_eligible'] ? $worked : 0;
            }
        }

        $halfDayThreshold = $s['is_saturday_half_day']
            ? (int) floor($s['expected_minutes'] / 2) : $s['half_day_minutes'];

        if (in_array($forcedStatus, ['leave', 'absent', 'holiday', 'weekend', 'half_day'], true)
            || (in_array($forcedStatus, ['present', 'late'], true) && ! $in)) {
            // present/late without times = marked by hand, no hours tracked
            $status = $forcedStatus;
        } elseif (! $in) {
            $status = $s['is_holiday'] ? 'holiday' : ($s['is_weekend'] ? 'weekend' : 'absent');
        } elseif (! $s['is_working_day']) {
            $status = 'present';
        } elseif ($out && $worked < $halfDayThreshold) {
            $status = 'half_day';
        } elseif ($late > 0) {
            $status = 'late';
        } else {
            $status = 'present';
        }

        if (in_array($status, ['absent', 'holiday', 'weekend', 'leave'], true) && ! $in) {
            $late = $early = $worked = $ot = 0;
        }

        return [
            'clock_in' => $in,
            'clock_out' => $out,
            'status' => $status,
            'late_minutes' => $late,
            'early_leave_minutes' => $early,
            'worked_minutes' => $worked,
            'ot_minutes' => $ot,
            'schedule' => $s,
        ];
    }

    /**
     * Create or update the employee's attendance for a date (one row per employee per date).
     * $in / $out are times ("08:30") or datetimes; pass null to clear.
     */
    public function record(
        Employee $employee,
        string $date,
        ?string $in,
        ?string $out,
        string $source = 'manual',
        ?string $forcedStatus = null,
        ?string $notes = null,
        ?int $createdBy = null
    ): Attendance {
        $date = Carbon::parse($date)->toDateString();
        $calc = $this->calculate($employee, $date, $this->parseTime($in, $date), $this->parseTime($out, $date), $forcedStatus);

        $attendance = Attendance::firstOrNew(['employee_id' => $employee->id, 'date' => $date]);
        $attendance->fill([
            'clock_in' => $calc['clock_in'],
            'clock_out' => $calc['clock_out'],
            'status' => $calc['status'],
            'late_minutes' => $calc['late_minutes'],
            'early_leave_minutes' => $calc['early_leave_minutes'],
            'worked_minutes' => $calc['worked_minutes'],
            'ot_minutes' => $calc['ot_minutes'],
            'source' => $source,
            'notes' => $notes,
        ]);
        if (! $attendance->exists) {
            $attendance->created_by = $createdBy;
        }
        $attendance->save();

        return $attendance->fresh('employee');
    }

    /**
     * Mark a date as leave (used by phase 3). Keeps any clock times already recorded.
     */
    public function markLeave(Employee $employee, string $date, ?string $notes = null, ?int $createdBy = null): Attendance
    {
        $existing = Attendance::where('employee_id', $employee->id)->whereDate('date', $date)->first();

        return $this->record(
            $employee,
            $date,
            $existing && $existing->clock_in ? $existing->clock_in->format('Y-m-d H:i') : null,
            $existing && $existing->clock_out ? $existing->clock_out->format('Y-m-d H:i') : null,
            $existing ? $existing->source : 'manual',
            'leave',
            $notes,
            $createdBy
        );
    }

    /**
     * Undo a leave mark (phase 3, when leave is cancelled): recalculate without the forced status,
     * or delete the row if it has no times.
     */
    public function unmarkLeave(Employee $employee, string $date): void
    {
        $existing = Attendance::where('employee_id', $employee->id)->whereDate('date', $date)->first();
        if (! $existing || $existing->status !== 'leave') {
            return;
        }
        if (! $existing->clock_in) {
            $existing->delete();

            return;
        }
        $this->record($employee, $date, $existing->clock_in->format('Y-m-d H:i'),
            $existing->clock_out ? $existing->clock_out->format('Y-m-d H:i') : null, $existing->source, null, $existing->notes);
    }

    /**
     * Clock in now (no-op if today's record already has a clock-in). Night shifts that started
     * yesterday and are still open are treated as yesterday's record.
     */
    public function clockIn(Employee $employee, string $source, ?Carbon $now = null): Attendance
    {
        $now = ($now ?: HrSetting::now())->copy()->second(0);
        $today = $now->toDateString();
        $existing = Attendance::where('employee_id', $employee->id)->whereDate('date', $today)->first();
        if ($existing && $existing->clock_in) {
            return $existing->load('employee');
        }

        return $this->record($employee, $today, $now->format('Y-m-d H:i'), null, $source, null,
            $existing ? $existing->notes : null);
    }

    /**
     * Clock out now. Uses today's open record, or yesterday's still-open record (night shift).
     */
    public function clockOut(Employee $employee, string $source, ?Carbon $now = null): ?Attendance
    {
        $now = ($now ?: HrSetting::now())->copy()->second(0);
        $open = Attendance::where('employee_id', $employee->id)
            ->whereNotNull('clock_in')
            ->whereNull('clock_out')
            ->whereDate('date', '>=', $now->copy()->subDay()->toDateString())
            ->orderByDesc('date')
            ->first();
        if (! $open) {
            return null;
        }

        return $this->record($employee, $open->date->format('Y-m-d'), $open->clock_in->format('Y-m-d H:i'),
            $now->format('Y-m-d H:i'), $open->source === 'self' ? 'self' : $source, null, $open->notes);
    }

    /**
     * POS login hook: auto clock-in for a user linked to an active employee when enabled.
     * Never throws — login must not fail because of HR.
     */
    public function autoClockInOnLogin(User $user): void
    {
        try {
            $settings = HrSetting::getAll();
            if (! $settings['attendance_pos_auto'] || ! $settings['auto_clock_in_on_pos_login']) {
                return;
            }
            $employee = Employee::where('user_id', $user->id)->where('status', Employee::STATUS_ACTIVE)->first();
            if ($employee) {
                $this->clockIn($employee, 'pos_auto');
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /**
     * Logout hook: auto clock-out when enabled. Never throws.
     */
    public function autoClockOutOnLogout(User $user): void
    {
        try {
            $settings = HrSetting::getAll();
            if (! $settings['attendance_pos_auto'] || ! $settings['auto_clock_out_on_logout']) {
                return;
            }
            $employee = Employee::where('user_id', $user->id)->where('status', Employee::STATUS_ACTIVE)->first();
            if ($employee) {
                $this->clockOut($employee, 'pos_auto');
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /**
     * Active employees (optionally on a date: joined on/before it), filtered by branch/department.
     */
    public function activeEmployeesQuery(array $filters = [], ?string $onDate = null): Builder
    {
        $query = Employee::with(['warehouse', 'department', 'designation'])
            ->where('status', Employee::STATUS_ACTIVE);
        if ($onDate) {
            $query->where(function ($q) use ($onDate) {
                $q->whereNull('joining_date')->orWhereDate('joining_date', '<=', $onDate);
            });
        }
        foreach (['warehouse_id', 'department_id', 'designation_id'] as $filter) {
            if (! empty($filters[$filter]) && $filters[$filter] !== '0') {
                $query->where($filter, $filters[$filter]);
            }
        }
        if (! empty($filters['employee_id'])) {
            $query->where('id', $filters['employee_id']);
        }

        return $query->orderBy('first_name')->orderBy('last_name');
    }

    /**
     * Day status for a date with no record: holiday / weekend / unmarked (past working day) / null (future).
     */
    public function derivedStatus(Employee $employee, string $date): ?string
    {
        $s = $this->schedule->forDate($employee, $date);
        if ($s['is_holiday']) {
            return 'holiday';
        }
        if ($s['is_weekend']) {
            return 'weekend';
        }
        if ($employee->joining_date && $date < $employee->joining_date->format('Y-m-d')) {
            return null;
        }

        return $date <= HrSetting::today() ? 'unmarked' : null;
    }

    /**
     * Totals for one employee over [from, to]. Used by reports and phase 4 payroll.
     * "unmarked" = past working days with no attendance row (not counted as absent automatically).
     */
    public function summary(Employee $employee, string $from, string $to, ?Collection $records = null): array
    {
        $records = $records ?? Attendance::where('employee_id', $employee->id)
            ->whereDate('date', '>=', $from)->whereDate('date', '<=', $to)->get();
        $byDate = $records->keyBy(fn ($r) => $r->date->format('Y-m-d'));

        $totals = array_fill_keys(array_keys(self::DAY_CODES), 0);
        $totals += [
            'worked_minutes' => 0,
            'ot_minutes' => 0,
            'late_minutes' => 0,
            'early_leave_minutes' => 0,
            'working_days' => 0.0,
            'paid_holidays' => 0,
        ];

        $cursor = Carbon::parse($from);
        $last = Carbon::parse($to);
        while ($cursor->lessThanOrEqualTo($last)) {
            $date = $cursor->toDateString();
            $s = $this->schedule->forDate($employee, $date);
            if ($s['is_working_day']) {
                $totals['working_days'] += $s['is_saturday_half_day'] ? 0.5 : 1;
            }
            if ($s['is_holiday'] && $s['holiday']->is_paid && ! $s['is_weekend']) {
                $totals['paid_holidays']++;
            }
            $record = $byDate->get($date);
            if ($record) {
                $totals[$record->status]++;
                $totals['worked_minutes'] += $record->worked_minutes;
                $totals['ot_minutes'] += $record->ot_minutes;
                $totals['late_minutes'] += $record->late_minutes;
                $totals['early_leave_minutes'] += $record->early_leave_minutes;
            } else {
                $derived = $this->derivedStatus($employee, $date);
                if ($derived) {
                    $totals[$derived]++;
                }
            }
            $cursor->addDay();
        }

        return $totals;
    }

    /**
     * Daily report rows for all matching active employees on a date (derived status for missing rows).
     */
    public function dailyReport(string $date, array $filters = []): array
    {
        $employees = $this->activeEmployeesQuery($filters, $date)->get();
        $records = Attendance::whereIn('employee_id', $employees->pluck('id'))->whereDate('date', $date)
            ->get()->keyBy('employee_id');

        return $employees->map(function (Employee $employee) use ($records, $date) {
            $record = $records->get($employee->id);
            $s = $this->schedule->forDate($employee, $date);

            return [
                'employee_id' => $employee->id,
                'employee_code' => $employee->employee_code,
                'employee_name' => $employee->full_name,
                'branch_name' => optional($employee->warehouse)->name,
                'department_name' => optional($employee->department)->name,
                'designation_name' => optional($employee->designation)->name,
                'attendance_id' => $record ? $record->id : null,
                'expected_start' => $s['start'],
                'expected_end' => $s['end'],
                'shift_name' => $s['shift_name'],
                'clock_in' => $record && $record->clock_in ? $record->clock_in->format('H:i') : null,
                'clock_out' => $record && $record->clock_out ? $record->clock_out->format('H:i') : null,
                'status' => $record ? $record->status : $this->derivedStatus($employee, $date),
                'late_minutes' => $record ? $record->late_minutes : 0,
                'early_leave_minutes' => $record ? $record->early_leave_minutes : 0,
                'worked_minutes' => $record ? $record->worked_minutes : 0,
                'ot_minutes' => $record ? $record->ot_minutes : 0,
                'source' => $record ? $record->source : null,
                'notes' => $record ? $record->notes : null,
            ];
        })->values()->toArray();
    }

    /**
     * Monthly sheet: employee × day status codes plus totals.
     */
    public function monthlySheet(int $year, int $month, array $filters = []): array
    {
        $from = Carbon::create($year, $month, 1)->startOfDay();
        $to = $from->copy()->endOfMonth()->startOfDay();
        $employees = $this->activeEmployeesQuery($filters, $to->toDateString())->get();
        $records = Attendance::whereIn('employee_id', $employees->pluck('id'))
            ->whereDate('date', '>=', $from->toDateString())->whereDate('date', '<=', $to->toDateString())
            ->get()->groupBy('employee_id');

        $days = [];
        for ($d = $from->copy(); $d->lessThanOrEqualTo($to); $d->addDay()) {
            $days[] = ['day' => $d->day, 'date' => $d->toDateString(), 'weekday' => $d->format('D')];
        }

        $rows = $employees->map(function (Employee $employee) use ($records, $days, $from, $to) {
            $empRecords = $records->get($employee->id, collect());
            $byDate = $empRecords->keyBy(fn ($r) => $r->date->format('Y-m-d'));
            $codes = [];
            foreach ($days as $day) {
                $record = $byDate->get($day['date']);
                $status = $record ? $record->status : $this->derivedStatus($employee, $day['date']);
                $codes[$day['day']] = $status ? self::DAY_CODES[$status] : '';
            }

            return [
                'employee_id' => $employee->id,
                'employee_code' => $employee->employee_code,
                'employee_name' => $employee->full_name,
                'branch_name' => optional($employee->warehouse)->name,
                'department_name' => optional($employee->department)->name,
                'days' => $codes,
                'totals' => $this->summary($employee, $from->toDateString(), $to->toDateString(), $empRecords),
            ];
        })->values()->toArray();

        return [
            'year' => $year,
            'month' => $month,
            'days' => $days,
            'codes' => self::DAY_CODES,
            'rows' => $rows,
        ];
    }
}
