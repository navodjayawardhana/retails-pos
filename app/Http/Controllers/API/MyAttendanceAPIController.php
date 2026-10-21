<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Models\Employee;
use App\Models\HrSetting;
use App\Services\Hrm\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Self service for the logged-in user's linked employee (view_own_hr), and POS clock-out.
 */
class MyAttendanceAPIController extends AppBaseController
{
    private AttendanceService $attendance;

    public function __construct(AttendanceService $attendance)
    {
        $this->attendance = $attendance;
    }

    /**
     * GET my-attendance?month=YYYY-MM
     */
    public function index(Request $request, AttendanceAPIController $attendanceController): JsonResponse
    {
        $employee = $this->myEmployee();
        if (! $employee) {
            return $this->notLinked();
        }
        $data = $attendanceController->employeeMonth($employee, $request->get('month'));
        $todayRecord = $employee->attendances()->whereDate('date', HrSetting::today())->first();
        $settings = HrSetting::getAll();
        $data['today'] = $todayRecord ? array_merge(['id' => $todayRecord->id], $todayRecord->prepareAttributes()) : null;
        $data['can_self_clock'] = (bool) ($settings['attendance_pos_auto'] || $settings['attendance_manual']);

        return $this->sendResponse($data, 'Attendance retrieved successfully');
    }

    public function clockIn(Request $request): JsonResponse
    {
        $employee = $this->myEmployee();
        if (! $employee) {
            return $this->notLinked();
        }
        if ($error = $this->selfClockError()) {
            return $error;
        }
        $record = $this->attendance->clockIn($employee, $this->source($request));

        return $this->sendResponse(array_merge(['id' => $record->id], $record->prepareAttributes()),
            'Clocked in at '.$record->clock_in->format('H:i'));
    }

    public function clockOut(Request $request): JsonResponse
    {
        $employee = $this->myEmployee();
        if (! $employee) {
            return $this->notLinked();
        }
        if ($error = $this->selfClockError()) {
            return $error;
        }
        $record = $this->attendance->clockOut($employee, $this->source($request));
        if (! $record) {
            return $this->sendError('You are not clocked in today.');
        }

        return $this->sendResponse(array_merge(['id' => $record->id], $record->prepareAttributes()),
            'Clocked out at '.$record->clock_out->format('H:i'));
    }

    private function myEmployee(): ?Employee
    {
        return Employee::where('user_id', Auth::id())->where('status', Employee::STATUS_ACTIVE)->first();
    }

    private function notLinked(): JsonResponse
    {
        return $this->sendError('Your login is not linked to an active employee.');
    }

    private function selfClockError(): ?JsonResponse
    {
        $settings = HrSetting::getAll();
        if (! $settings['attendance_pos_auto'] && ! $settings['attendance_manual']) {
            return $this->sendError('Clocking in and out is turned off in HR Settings.');
        }

        return null;
    }

    private function source(Request $request): string
    {
        return $request->get('source') === 'pos' ? 'pos_auto' : 'self';
    }
}
