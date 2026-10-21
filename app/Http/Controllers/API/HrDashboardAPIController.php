<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrSetting;
use App\Models\LeaveRequest;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Services\Hrm\LeaveService;
use App\Services\Hrm\WorkScheduleService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HrDashboardAPIController extends AppBaseController
{
    /**
     * GET hr-dashboard?warehouse_id=
     */
    public function index(Request $request, WorkScheduleService $schedule, LeaveService $leave): JsonResponse
    {
        $warehouseId = $request->get('warehouse_id') ?: null;
        $today = HrSetting::today();
        $now = Carbon::parse($today);

        $employees = Employee::with(['department', 'designation', 'warehouse'])
            ->where('status', 'active')
            ->when($warehouseId, fn ($q) => $q->where('warehouse_id', $warehouseId))
            ->get();
        $employeeIds = $employees->pluck('id');

        $todayRows = Attendance::whereIn('employee_id', $employeeIds)->whereDate('date', $today)->get()
            ->keyBy('employee_id');

        $onLeaveToday = LeaveRequest::with(['employee', 'leaveType'])
            ->whereIn('employee_id', $employeeIds)
            ->where('status', LeaveRequest::STATUS_APPROVED)
            ->whereDate('from_date', '<=', $today)->whereDate('to_date', '>=', $today)
            ->get();
        $onLeaveIds = $onLeaveToday->pluck('employee_id')->all();

        // today's exceptions: late, absent, or a working day not yet marked
        $absent = [];
        $late = [];
        foreach ($employees as $employee) {
            $row = $todayRows->get($employee->id);
            if ($row && $row->status === 'late') {
                $late[] = $this->personRow($employee, [
                    'clock_in' => $row->clock_in ? Carbon::parse($row->clock_in)->format('H:i') : null,
                    'late_minutes' => (int) $row->late_minutes,
                ]);
                continue;
            }
            if (in_array($employee->id, $onLeaveIds)) {
                continue;
            }
            if ($row && $row->status === 'absent') {
                $absent[] = $this->personRow($employee, ['reason' => 'absent']);
                continue;
            }
            if (! $row) {
                $day = $schedule->forDate($employee, $today);
                // only flag once the shift has started (plus grace), not first thing in the morning
                $due = $day['start_at'] ? $day['start_at']->copy()->addMinutes((int) $day['grace_minutes']) : null;
                if ($day['is_working_day'] && $due && HrSetting::now()->gt($due)) {
                    $absent[] = $this->personRow($employee, ['reason' => 'not_marked']);
                }
            }
        }

        $presentToday = $todayRows->whereIn('status', ['present', 'late', 'half_day'])->count();

        $pending = LeaveRequest::with(['employee', 'leaveType'])
            ->whereIn('employee_id', $employeeIds)
            ->where('status', LeaveRequest::STATUS_PENDING)
            ->orderBy('from_date')->get();

        $upcoming = LeaveRequest::with(['employee', 'leaveType'])
            ->whereIn('employee_id', $employeeIds)
            ->whereIn('status', [LeaveRequest::STATUS_APPROVED, LeaveRequest::STATUS_PENDING])
            ->whereDate('from_date', '<=', $now->copy()->addDays(7)->toDateString())
            ->whereDate('to_date', '>', $today)
            ->orderBy('from_date')->limit(15)->get();

        // attendance trend: last 30 days
        $from = $now->copy()->subDays(29)->toDateString();
        $trendRows = Attendance::whereIn('employee_id', $employeeIds)
            ->whereDate('date', '>=', $from)->whereDate('date', '<=', $today)
            ->selectRaw('DATE(date) as d, status, COUNT(*) as c')
            ->groupBy('d', 'status')->get();
        $trend = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = $now->copy()->subDays($i)->toDateString();
            $trend[$date] = ['date' => $date, 'present' => 0, 'late' => 0, 'absent' => 0, 'leave' => 0];
        }
        foreach ($trendRows as $row) {
            if (! isset($trend[$row->d])) {
                continue;
            }
            $key = match ($row->status) {
                'present', 'half_day' => 'present',
                'late' => 'late',
                'absent' => 'absent',
                'leave' => 'leave',
                default => null,
            };
            if ($key) {
                $trend[$row->d][$key] += (int) $row->c;
            }
        }

        // headcount
        $byDepartment = $employees->groupBy(fn ($e) => optional($e->department)->name ?: '—')
            ->map(fn ($group, $name) => ['name' => $name, 'count' => $group->count()])->values();
        $byBranch = $employees->groupBy(fn ($e) => optional($e->warehouse)->name ?: '—')
            ->map(fn ($group, $name) => ['name' => $name, 'count' => $group->count()])->values();

        // leave by type this month
        $leaveByType = [];
        foreach ($employees as $employee) {
            $summary = $leave->monthSummary($employee, (int) $now->year, (int) $now->month);
            foreach ($summary['by_type'] as $type) {
                $key = $type['leave_type_id'];
                $leaveByType[$key] = $leaveByType[$key] ?? ['name' => $type['name'], 'days' => 0.0];
                $leaveByType[$key]['days'] += $type['days'];
            }
        }

        // payroll: this month + cost for the last 6 months
        $monthStart = $now->copy()->startOfMonth()->toDateString();
        $runs = PayrollRun::whereDate('month', $monthStart)
            ->when($warehouseId, fn ($q) => $q->where(fn ($w) => $w->whereNull('warehouse_id')->orWhere('warehouse_id', $warehouseId)))
            ->get();
        $payrollCost = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = $now->copy()->startOfMonth()->subMonths($i);
            $slips = Payslip::whereDate('month', $month->toDateString())
                ->when($warehouseId, fn ($q) => $q->whereHas('employee', fn ($e) => $e->where('warehouse_id', $warehouseId)))
                ->selectRaw('COALESCE(SUM(gross_earnings),0) gross, COALESCE(SUM(net_pay),0) net, COALESCE(SUM(epf_employer + etf),0) employer')
                ->first();
            $payrollCost[] = [
                'month' => $month->format('Y-m'),
                'gross' => round((float) $slips->gross, 2),
                'net' => round((float) $slips->net, 2),
                'employer' => round((float) $slips->employer, 2),
            ];
        }

        return $this->sendResponse([
            'date' => $today,
            'kpis' => [
                'active_employees' => $employees->count(),
                'present_today' => $presentToday,
                'late_today' => count($late),
                'on_leave_today' => count(array_unique($onLeaveIds)),
                'pending_leave' => $pending->count(),
                'payroll_net' => round((float) $runs->sum('net_total'), 2),
                'payroll_status' => $runs->isEmpty() ? null : ($runs->pluck('status')->unique()->count() === 1 ? $runs->first()->status : 'mixed'),
                'payroll_month' => $now->format('Y-m'),
            ],
            'trend' => array_values($trend),
            'by_department' => $byDepartment,
            'by_branch' => $byBranch,
            'leave_by_type' => array_values(array_map(fn ($t) => ['name' => $t['name'], 'days' => round($t['days'], 1)], $leaveByType)),
            'payroll_cost' => $payrollCost,
            'absent_today' => $absent,
            'late_today' => $late,
            'upcoming_leave' => $upcoming->map(fn ($r) => $this->leaveRow($r))->values(),
            'pending_leave' => $pending->take(10)->map(fn ($r) => $this->leaveRow($r))->values(),
        ], 'HR dashboard retrieved successfully');
    }

    private function personRow(Employee $employee, array $extra = []): array
    {
        return array_merge([
            'employee_id' => $employee->id,
            'employee_code' => $employee->employee_code,
            'name' => trim($employee->first_name.' '.$employee->last_name),
            'department' => optional($employee->department)->name,
            'branch' => optional($employee->warehouse)->name,
        ], $extra);
    }

    private function leaveRow(LeaveRequest $request): array
    {
        return [
            'id' => $request->id,
            'employee_id' => $request->employee_id,
            'name' => $request->employee ? trim($request->employee->first_name.' '.$request->employee->last_name) : null,
            'type' => optional($request->leaveType)->name,
            'color' => optional($request->leaveType)->color,
            'from_date' => Carbon::parse($request->from_date)->toDateString(),
            'to_date' => Carbon::parse($request->to_date)->toDateString(),
            'days' => (float) $request->days,
            'is_half_day' => (bool) $request->is_half_day,
            'status' => $request->status,
        ];
    }
}
