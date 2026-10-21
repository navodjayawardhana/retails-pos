<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Http\Resources\LeaveRequestResource;
use App\Models\Employee;
use App\Models\HrSetting;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Services\Hrm\LeaveService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Self service leave for the logged-in user's linked employee (view_own_hr).
 */
class MyLeaveAPIController extends AppBaseController
{
    private LeaveService $leave;

    public function __construct(LeaveService $leave)
    {
        $this->leave = $leave;
    }

    /**
     * GET my-leave?year= — balances, my requests for the year and the types I can apply for.
     */
    public function index(Request $request, LeaveEntitlementAPIController $entitlements): JsonResponse
    {
        $employee = $this->myEmployee();
        if (! $employee) {
            return $this->notLinked();
        }
        $year = (int) ($request->get('year') ?: Carbon::parse(HrSetting::today())->year);
        $data = $entitlements->employeeYear($employee, $year);
        $data['employee'] = [
            'id' => $employee->id,
            'employee_code' => $employee->employee_code,
            'full_name' => $employee->full_name,
        ];
        $data['leave_types'] = LeaveType::where('is_active', true)->orderBy('id')->get()
            ->filter(fn (LeaveType $t) => $t->appliesTo($employee))
            ->map(fn (LeaveType $t) => array_merge(['id' => $t->id], $t->prepareAttributes()))
            ->values();

        return $this->sendResponse($data, 'Leave retrieved successfully');
    }

    /**
     * POST my-leave (multipart) — always pending.
     */
    public function store(Request $request, LeaveRequestAPIController $requests): JsonResponse
    {
        $employee = $this->myEmployee();
        if (! $employee) {
            return $this->notLinked();
        }
        $data = $requests->validated($request, false);
        $data['employee_id'] = $employee->id;
        $leave = $this->leave->apply($data, Auth::id(), $request->file('attachment'), false);

        return $this->sendResponse(new LeaveRequestResource($leave), 'Leave request sent for approval');
    }

    /**
     * GET my-leave/preview — same as leave-preview for my own employee.
     */
    public function preview(Request $request, LeaveRequestAPIController $requests): JsonResponse
    {
        return $this->sendResponse($requests->previewFor($this->myEmployee(), $request), 'Preview');
    }

    /**
     * POST my-leave/{id}/cancel — only my own pending requests.
     */
    public function cancel($id): JsonResponse
    {
        $employee = $this->myEmployee();
        if (! $employee) {
            return $this->notLinked();
        }
        $leave = LeaveRequest::where('employee_id', $employee->id)->find($id);
        if (! $leave) {
            return $this->sendError('Leave request not found.');
        }
        if ($leave->status !== LeaveRequest::STATUS_PENDING) {
            return $this->sendError('Only pending requests can be cancelled. Ask HR to cancel an approved leave.');
        }

        return $this->sendResponse(new LeaveRequestResource($this->leave->cancel($leave, Auth::id())), 'Leave request cancelled');
    }

    private function myEmployee(): ?Employee
    {
        return Employee::where('user_id', Auth::id())->where('status', Employee::STATUS_ACTIVE)->first();
    }

    private function notLinked(): JsonResponse
    {
        return $this->sendError('Your login is not linked to an active employee.');
    }
}
