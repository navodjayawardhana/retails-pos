<?php

namespace App\Services\Hrm;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrSetting;
use App\Models\LeaveEntitlement;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

/**
 * Leave entitlements, balances, requests and their effect on attendance.
 * Every leave write goes through here.
 */
class LeaveService
{
    private WorkScheduleService $schedule;

    private AttendanceService $attendance;

    public function __construct(WorkScheduleService $schedule, AttendanceService $attendance)
    {
        $this->schedule = $schedule;
        $this->attendance = $attendance;
    }

    // ---------- entitlements ----------

    /**
     * Default allowed days for a year: the type's yearly days, pro-rated by remaining months
     * (joining month counted) when the employee joined during that year and the setting is on.
     * Rounded down to the nearest half day.
     */
    public function defaultDays(Employee $employee, LeaveType $type, int $year): float
    {
        if ($type->is_unlimited) {
            return 0.0;
        }
        $days = (float) $type->default_days_per_year;
        $joining = $employee->joining_date ? Carbon::parse($employee->joining_date) : null;
        if ($joining && (int) $joining->year === $year && HrSetting::get('prorate_first_year')) {
            $months = 12 - $joining->month + 1;
            $days = floor(($days * $months / 12) * 2) / 2;
        }
        if ($joining && (int) $joining->year > $year) {
            return 0.0;
        }

        return $days;
    }

    /**
     * Unused days from the previous year that can be brought forward (types with carry forward only).
     */
    public function carryForwardFrom(Employee $employee, LeaveType $type, int $year): float
    {
        if (! $type->carry_forward || $type->is_unlimited) {
            return 0.0;
        }
        $previous = $year - 1;
        // last year's stored allowance, or its default if that year was never set up
        $entitled = $this->entitledTotal($employee, $type, $previous);
        if (! $entitled) {
            return 0.0;
        }
        $unused = max(0, $entitled - $this->usedDays($employee, $type, $previous));
        if ($type->max_carry_forward_days !== null) {
            $unused = min($unused, (float) $type->max_carry_forward_days);
        }

        return round($unused, 1);
    }

    /**
     * Entitled total (days + carried forward) for a year. Uses the stored row, or the default
     * when there is none ($fallbackToDefault). Null for unlimited types.
     */
    public function entitledTotal(Employee $employee, LeaveType $type, int $year, bool $fallbackToDefault = true): ?float
    {
        if ($type->is_unlimited) {
            return null;
        }
        $row = LeaveEntitlement::where('employee_id', $employee->id)
            ->where('leave_type_id', $type->id)->where('year', $year)->first();
        if ($row) {
            return $row->total;
        }

        return $fallbackToDefault ? $this->defaultDays($employee, $type, $year) : null;
    }

    /**
     * Create (or refresh) entitlement rows for a year for active employees and active limited types.
     * Rows set by hand (is_custom) are kept unless $overwriteCustom.
     *
     * @return array{created: int, updated: int, skipped: int}
     */
    public function initialiseYear(int $year, ?array $employeeIds = null, bool $overwriteCustom = false): array
    {
        $result = ['created' => 0, 'updated' => 0, 'skipped' => 0];
        $types = LeaveType::where('is_active', true)->where('is_unlimited', false)->get();
        $employees = Employee::where('status', Employee::STATUS_ACTIVE)
            ->when($employeeIds, fn ($q) => $q->whereIn('id', $employeeIds))
            ->get();

        DB::transaction(function () use ($types, $employees, $year, $overwriteCustom, &$result) {
            foreach ($employees as $employee) {
                foreach ($types as $type) {
                    if (! $type->appliesTo($employee)) {
                        continue;
                    }
                    $row = LeaveEntitlement::where('employee_id', $employee->id)
                        ->where('leave_type_id', $type->id)->where('year', $year)->first();
                    if ($row && $row->is_custom && ! $overwriteCustom) {
                        $result['skipped']++;

                        continue;
                    }
                    $values = [
                        'days' => $this->defaultDays($employee, $type, $year),
                        'carried_forward' => $this->carryForwardFrom($employee, $type, $year),
                        'is_custom' => false,
                    ];
                    if ($row) {
                        $row->update($values);
                        $result['updated']++;
                    } else {
                        LeaveEntitlement::create(array_merge($values, [
                            'employee_id' => $employee->id,
                            'leave_type_id' => $type->id,
                            'year' => $year,
                        ]));
                        $result['created']++;
                    }
                }
            }
        });

        return $result;
    }

    /**
     * Set an employee's allowed days by hand for a year (marks the rows custom).
     *
     * @param  array<int, array{leave_type_id: int, days: float, carried_forward?: float}>  $items
     */
    public function setEntitlements(Employee $employee, int $year, array $items): void
    {
        DB::transaction(function () use ($employee, $year, $items) {
            foreach ($items as $item) {
                $type = LeaveType::findOrFail($item['leave_type_id']);
                if ($type->is_unlimited) {
                    continue;
                }
                $row = LeaveEntitlement::firstOrNew([
                    'employee_id' => $employee->id,
                    'leave_type_id' => $type->id,
                    'year' => $year,
                ]);
                $row->days = (float) $item['days'];
                if (array_key_exists('carried_forward', $item) && $item['carried_forward'] !== null) {
                    $row->carried_forward = (float) $item['carried_forward'];
                } elseif (! $row->exists) {
                    $row->carried_forward = $this->carryForwardFrom($employee, $type, $year);
                }
                $row->is_custom = true;
                $row->save();
            }
        });
    }

    // ---------- usage and balances ----------

    /**
     * Days taken in a year (requests are always within one year). Default: approved only.
     */
    public function usedDays(Employee $employee, LeaveType $type, int $year, array $statuses = [LeaveRequest::STATUS_APPROVED], ?int $excludeId = null): float
    {
        return (float) LeaveRequest::where('employee_id', $employee->id)
            ->where('leave_type_id', $type->id)
            ->whereIn('status', $statuses)
            ->whereYear('from_date', $year)
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))
            ->sum('days');
    }

    /**
     * Per-type balances for a year (types that apply to the employee, plus any type already used).
     *
     * @return array<int, array> keys: leave_type_id, name, code, color, is_paid, is_unlimited,
     *   allow_half_day, requires_document, days, carried_forward, entitled, is_custom, has_row,
     *   used, pending, balance (null when unlimited)
     */
    public function balances(Employee $employee, int $year): array
    {
        $types = LeaveType::orderBy('id')->get();
        $rows = LeaveEntitlement::where('employee_id', $employee->id)->where('year', $year)->get()->keyBy('leave_type_id');
        $usage = LeaveRequest::where('employee_id', $employee->id)->whereYear('from_date', $year)
            ->whereIn('status', [LeaveRequest::STATUS_APPROVED, LeaveRequest::STATUS_PENDING])
            ->selectRaw('leave_type_id, status, SUM(days) as total')
            ->groupBy('leave_type_id', 'status')->get();

        $result = [];
        foreach ($types as $type) {
            $used = (float) optional($usage->first(fn ($u) => $u->leave_type_id == $type->id && $u->status === LeaveRequest::STATUS_APPROVED))->total;
            $pending = (float) optional($usage->first(fn ($u) => $u->leave_type_id == $type->id && $u->status === LeaveRequest::STATUS_PENDING))->total;
            $applies = $type->appliesTo($employee) && $type->is_active;
            if (! $applies && $used == 0 && $pending == 0) {
                continue;
            }
            $row = $rows->get($type->id);
            $days = $type->is_unlimited ? null : ($row ? (float) $row->days : $this->defaultDays($employee, $type, $year));
            $carried = $type->is_unlimited ? null : ($row ? (float) $row->carried_forward : 0.0);
            $entitled = $type->is_unlimited ? null : $days + $carried;
            $result[] = [
                'leave_type_id' => $type->id,
                'name' => $type->name,
                'code' => $type->code,
                'color' => $type->color,
                'is_paid' => $type->is_paid,
                'is_unlimited' => $type->is_unlimited,
                'allow_half_day' => $type->allow_half_day,
                'requires_document' => $type->requires_document,
                'is_active' => $type->is_active,
                'days' => $days,
                'carried_forward' => $carried,
                'entitled' => $entitled,
                'is_custom' => $row ? $row->is_custom : false,
                'has_row' => (bool) $row,
                'used' => $used,
                'pending' => $pending,
                'balance' => $type->is_unlimited ? null : round($entitled - $used, 1),
            ];
        }

        return $result;
    }

    // ---------- requests ----------

    /**
     * Working days between two dates for this employee (weekends/holidays excluded, Saturday
     * half day = 0.5). A half-day request is 0.5 of a working day.
     */
    public function countDays(Employee $employee, string $from, string $to, bool $isHalfDay = false): float
    {
        if ($isHalfDay) {
            $schedule = $this->schedule->forDate($employee, $from);

            return $schedule['is_working_day'] ? 0.5 : 0.0;
        }

        return $this->schedule->workingDays($employee, $from, $to);
    }

    /**
     * Validate a request and return its day count. Throws a 422 with a readable message.
     */
    public function validateRequest(Employee $employee, LeaveType $type, string $from, string $to, bool $isHalfDay, ?string $halfSession, ?int $excludeId = null, bool $hasAttachment = false, bool $checkDocument = false): float
    {
        $fromDate = Carbon::parse($from)->startOfDay();
        $toDate = Carbon::parse($to)->startOfDay();

        if ($employee->status !== Employee::STATUS_ACTIVE) {
            $this->fail('Leave can only be added for active employees.');
        }
        if (! $type->is_active) {
            $this->fail('This leave type is not active.');
        }
        if (! $type->appliesTo($employee)) {
            $this->fail($type->name.' is only available to '.$type->gender.' employees.');
        }
        if ($toDate->lessThan($fromDate)) {
            $this->fail('The end date must be on or after the start date.');
        }
        if ($fromDate->year !== $toDate->year) {
            $this->fail('A leave request must stay within one year. Split it into two requests.');
        }
        if ($isHalfDay) {
            if (! $type->allow_half_day) {
                $this->fail($type->name.' cannot be taken as a half day.');
            }
            if (! $fromDate->equalTo($toDate)) {
                $this->fail('A half day must start and end on the same date.');
            }
            if (! in_array($halfSession, ['first', 'second'], true)) {
                $this->fail('Choose the first or second half of the day.');
            }
        }
        if ($checkDocument && $type->requires_document && ! $hasAttachment) {
            $this->fail($type->name.' needs a supporting document (e.g. a medical certificate).');
        }

        $days = $this->countDays($employee, $fromDate->toDateString(), $toDate->toDateString(), $isHalfDay);
        if ($days <= 0) {
            $this->fail('The selected dates have no working days (weekends and holidays are not counted).');
        }

        $overlap = LeaveRequest::where('employee_id', $employee->id)
            ->whereIn('status', [LeaveRequest::STATUS_PENDING, LeaveRequest::STATUS_APPROVED])
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))
            ->overlapping($fromDate->toDateString(), $toDate->toDateString())
            ->get();
        foreach ($overlap as $existing) {
            // two half days on the same date in different sessions may coexist
            if ($isHalfDay && $existing->is_half_day && $existing->half_session !== $halfSession) {
                continue;
            }
            $this->fail('These dates overlap another '.$existing->status.' leave request ('
                .$existing->from_date->format('Y-m-d').' to '.$existing->to_date->format('Y-m-d').').');
        }

        if (! $type->is_unlimited) {
            $entitled = (float) $this->entitledTotal($employee, $type, $fromDate->year);
            $taken = $this->usedDays($employee, $type, $fromDate->year,
                [LeaveRequest::STATUS_APPROVED, LeaveRequest::STATUS_PENDING], $excludeId);
            $available = round($entitled - $taken, 1);
            if ($days > $available) {
                $this->fail('Not enough '.$type->name.' balance: '.$days.' day(s) requested, '
                    .max(0, $available).' available (pending requests are counted).');
            }
        }

        return $days;
    }

    /**
     * Create a request (pending, or approved straight away when $approveNow).
     *
     * @param  array  $data  employee_id, leave_type_id, from_date, to_date, is_half_day, half_session, reason
     */
    public function apply(array $data, ?int $userId, $attachment = null, bool $approveNow = false): LeaveRequest
    {
        $employee = Employee::findOrFail($data['employee_id']);
        $type = LeaveType::findOrFail($data['leave_type_id']);
        $isHalfDay = filter_var($data['is_half_day'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $from = Carbon::parse($data['from_date'])->toDateString();
        $to = $isHalfDay ? $from : Carbon::parse($data['to_date'] ?? $data['from_date'])->toDateString();
        $halfSession = $isHalfDay ? ($data['half_session'] ?? null) : null;

        $days = $this->validateRequest($employee, $type, $from, $to, $isHalfDay, $halfSession, null, (bool) $attachment, true);

        return DB::transaction(function () use ($employee, $type, $from, $to, $isHalfDay, $halfSession, $days, $data, $userId, $attachment, $approveNow) {
            $request = LeaveRequest::create([
                'employee_id' => $employee->id,
                'leave_type_id' => $type->id,
                'from_date' => $from,
                'to_date' => $to,
                'is_half_day' => $isHalfDay,
                'half_session' => $halfSession,
                'days' => $days,
                'reason' => $data['reason'] ?? null,
                'status' => LeaveRequest::STATUS_PENDING,
                'created_by' => $userId,
            ]);
            if ($attachment) {
                $request->addMedia($attachment)->toMediaCollection(LeaveRequest::ATTACHMENT_PATH, config('app.image_disk'));
            }
            if ($approveNow) {
                $this->approve($request, $userId, $data['remarks'] ?? null);
            }

            return $request->fresh(['employee', 'leaveType', 'approver']);
        });
    }

    /**
     * Approve: re-checks balance/overlap, then marks each full working day as `leave` in attendance.
     * Days the employee already clocked in are left alone and listed in conflict_dates.
     * Half-day leave never changes attendance (the employee works the other half).
     */
    public function approve(LeaveRequest $request, ?int $userId, ?string $remarks = null): LeaveRequest
    {
        if ($request->status !== LeaveRequest::STATUS_PENDING) {
            $this->fail('Only pending requests can be approved.');
        }
        $employee = $request->employee;
        $type = $request->leaveType;
        $this->validateRequest($employee, $type, $request->from_date->toDateString(), $request->to_date->toDateString(),
            $request->is_half_day, $request->half_session, $request->id);

        return DB::transaction(function () use ($request, $employee, $userId, $remarks) {
            $marked = [];
            $conflicts = [];
            if (! $request->is_half_day) {
                foreach ($this->workingDates($employee, $request->from_date->toDateString(), $request->to_date->toDateString()) as $date) {
                    $existing = Attendance::where('employee_id', $employee->id)->whereDate('date', $date)->first();
                    if ($existing && $existing->clock_in) {
                        $conflicts[] = $date;

                        continue;
                    }
                    $this->attendance->markLeave($employee, $date, 'Leave: '.$request->leaveType->name, $userId);
                    $marked[] = $date;
                }
            }
            $request->update([
                'status' => LeaveRequest::STATUS_APPROVED,
                'approved_by' => $userId,
                'approved_at' => now(),
                'remarks' => $remarks ?? $request->remarks,
                'marked_dates' => $marked,
                'conflict_dates' => $conflicts,
            ]);

            return $request->fresh(['employee', 'leaveType', 'approver']);
        });
    }

    public function reject(LeaveRequest $request, ?int $userId, ?string $remarks = null): LeaveRequest
    {
        if (! in_array($request->status, [LeaveRequest::STATUS_PENDING, LeaveRequest::STATUS_APPROVED], true)) {
            $this->fail('Only pending or approved requests can be rejected.');
        }

        return $this->close($request, LeaveRequest::STATUS_REJECTED, $userId, $remarks);
    }

    public function cancel(LeaveRequest $request, ?int $userId, ?string $remarks = null): LeaveRequest
    {
        if (! in_array($request->status, [LeaveRequest::STATUS_PENDING, LeaveRequest::STATUS_APPROVED], true)) {
            $this->fail('Only pending or approved requests can be cancelled.');
        }

        return $this->close($request, LeaveRequest::STATUS_CANCELLED, $userId, $remarks);
    }

    /**
     * Reject/cancel; if it was approved, revert the attendance days it marked.
     */
    private function close(LeaveRequest $request, string $status, ?int $userId, ?string $remarks): LeaveRequest
    {
        return DB::transaction(function () use ($request, $status, $userId, $remarks) {
            if ($request->status === LeaveRequest::STATUS_APPROVED) {
                $this->revertAttendance($request);
            }
            $request->update([
                'status' => $status,
                'approved_by' => $status === LeaveRequest::STATUS_REJECTED ? $userId : $request->approved_by,
                'approved_at' => $status === LeaveRequest::STATUS_REJECTED ? now() : $request->approved_at,
                'remarks' => $remarks ?? $request->remarks,
                'marked_dates' => [],
            ]);

            return $request->fresh(['employee', 'leaveType', 'approver']);
        });
    }

    public function revertAttendance(LeaveRequest $request): void
    {
        foreach ($request->marked_dates ?: [] as $date) {
            $this->attendance->unmarkLeave($request->employee, $date);
        }
    }

    /**
     * Delete a request (reverting attendance if it was approved).
     */
    public function delete(LeaveRequest $request): void
    {
        DB::transaction(function () use ($request) {
            if ($request->status === LeaveRequest::STATUS_APPROVED) {
                $this->revertAttendance($request);
            }
            $request->clearMediaCollection(LeaveRequest::ATTACHMENT_PATH);
            $request->delete();
        });
    }

    /**
     * Working dates (Y-m-d) in a range for the employee.
     *
     * @return string[]
     */
    public function workingDates(Employee $employee, string $from, string $to): array
    {
        $dates = [];
        $cursor = Carbon::parse($from)->startOfDay();
        $last = Carbon::parse($to)->startOfDay();
        while ($cursor->lessThanOrEqualTo($last)) {
            if ($this->schedule->forDate($employee, $cursor->toDateString())['is_working_day']) {
                $dates[] = $cursor->toDateString();
            }
            $cursor->addDay();
        }

        return $dates;
    }

    // ---------- payroll / reports ----------

    /**
     * Approved leave falling in a month, split by paid/unpaid — for payroll.
     * Days are counted per working date inside the month (Saturday half day = 0.5,
     * a half-day request = 0.5), so requests crossing a month boundary are split correctly.
     *
     * @return array{paid_days: float, unpaid_days: float, by_type: array<int, array{leave_type_id:int, name:string, is_paid:bool, days:float}>}
     */
    public function monthSummary(Employee $employee, int $year, int $month): array
    {
        $start = Carbon::create($year, $month, 1)->startOfDay();
        $end = $start->copy()->endOfMonth()->startOfDay();
        $requests = LeaveRequest::with('leaveType')
            ->where('employee_id', $employee->id)
            ->where('status', LeaveRequest::STATUS_APPROVED)
            ->overlapping($start->toDateString(), $end->toDateString())
            ->get();

        $byType = [];
        $paid = 0.0;
        $unpaid = 0.0;
        foreach ($requests as $request) {
            if ($request->is_half_day) {
                $days = 0.5;
            } else {
                $from = $request->from_date->greaterThan($start) ? $request->from_date : $start;
                $to = $request->to_date->lessThan($end) ? $request->to_date : $end;
                $days = $this->schedule->workingDays($employee, $from->toDateString(), $to->toDateString());
            }
            $type = $request->leaveType;
            $key = $type->id;
            if (! isset($byType[$key])) {
                $byType[$key] = ['leave_type_id' => $type->id, 'name' => $type->name, 'is_paid' => $type->is_paid, 'days' => 0.0];
            }
            $byType[$key]['days'] += $days;
            if ($type->is_paid) {
                $paid += $days;
            } else {
                $unpaid += $days;
            }
        }

        return ['paid_days' => $paid, 'unpaid_days' => $unpaid, 'by_type' => array_values($byType)];
    }

    /**
     * Requests (approved + pending) touching a date range, for the calendar.
     */
    public function calendar(string $from, string $to, array $filters = []): Collection
    {
        return LeaveRequest::with(['employee.warehouse', 'employee.department', 'leaveType', 'approver'])
            ->whereIn('status', [LeaveRequest::STATUS_APPROVED, LeaveRequest::STATUS_PENDING])
            ->overlapping($from, $to)
            ->whereHas('employee', function ($q) use ($filters) {
                if (! empty($filters['warehouse_id'])) {
                    $q->where('warehouse_id', $filters['warehouse_id']);
                }
                if (! empty($filters['department_id'])) {
                    $q->where('department_id', $filters['department_id']);
                }
            })
            ->orderBy('from_date')
            ->get();
    }

    /**
     * Employee × type balance grid for a year.
     *
     * @return array{types: array, rows: array}
     */
    public function balanceReport(int $year, array $filters = []): array
    {
        $types = LeaveType::where('is_active', true)->orderBy('id')->get();
        $employees = Employee::with(['warehouse', 'department'])
            ->where('status', Employee::STATUS_ACTIVE)
            ->when(! empty($filters['warehouse_id']), fn ($q) => $q->where('warehouse_id', $filters['warehouse_id']))
            ->when(! empty($filters['department_id']), fn ($q) => $q->where('department_id', $filters['department_id']))
            ->when(! empty($filters['employee_id']), fn ($q) => $q->where('id', $filters['employee_id']))
            ->orderBy('employee_code')
            ->get();

        $rows = [];
        foreach ($employees as $employee) {
            $balances = collect($this->balances($employee, $year))->keyBy('leave_type_id');
            $cells = [];
            foreach ($types as $type) {
                $b = $balances->get($type->id);
                $cells[$type->id] = $b ? [
                    'entitled' => $b['entitled'],
                    'used' => $b['used'],
                    'pending' => $b['pending'],
                    'balance' => $b['balance'],
                ] : null;
            }
            $rows[] = [
                'employee_id' => $employee->id,
                'employee_code' => $employee->employee_code,
                'employee_name' => $employee->full_name,
                'branch_name' => optional($employee->warehouse)->name,
                'department_name' => optional($employee->department)->name,
                'cells' => $cells,
            ];
        }

        return [
            'year' => $year,
            'types' => $types->map(fn ($t) => [
                'id' => $t->id, 'name' => $t->name, 'code' => $t->code, 'color' => $t->color, 'is_unlimited' => $t->is_unlimited,
            ])->values()->toArray(),
            'rows' => $rows,
        ];
    }

    private function fail(string $message): void
    {
        throw new UnprocessableEntityHttpException($message);
    }
}
