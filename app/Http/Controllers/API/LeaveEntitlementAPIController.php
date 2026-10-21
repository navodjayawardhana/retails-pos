<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Models\Employee;
use App\Models\HrSetting;
use App\Models\LeaveRequest;
use App\Services\Hrm\LeaveService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveEntitlementAPIController extends AppBaseController
{
    private LeaveService $leave;

    public function __construct(LeaveService $leave)
    {
        $this->leave = $leave;
    }

    /**
     * GET leave-entitlements?employee_id=&year= — balances + this year's requests (employee Leave tab).
     */
    public function index(Request $request): JsonResponse
    {
        $employee = Employee::findOrFail($request->get('employee_id'));
        $year = $this->year($request);

        return $this->sendResponse($this->employeeYear($employee, $year), 'Leave balances retrieved successfully');
    }

    /**
     * POST leave-entitlements {employee_id, year, items:[{leave_type_id, days, carried_forward?}]}
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'year' => 'required|integer|min:2000|max:2100',
            'items' => 'required|array|min:1',
            'items.*.leave_type_id' => 'required|exists:leave_types,id',
            'items.*.days' => 'required|numeric|min:0|max:366',
            'items.*.carried_forward' => 'nullable|numeric|min:0|max:366',
        ], [
            'items.*.days.required' => 'Enter the days for every leave type.',
            'items.*.days.numeric' => 'Days must be a number.',
        ]);
        $employee = Employee::findOrFail($data['employee_id']);
        $this->leave->setEntitlements($employee, (int) $data['year'], $data['items']);

        return $this->sendResponse($this->employeeYear($employee, (int) $data['year']), 'Leave entitlements saved');
    }

    /**
     * POST leave-entitlements/initialise {year, overwrite_custom?} — create rows for all active employees
     * (with carry forward and first-year pro-rating).
     */
    public function initialise(Request $request): JsonResponse
    {
        $data = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'employee_ids' => 'nullable|array',
            'employee_ids.*' => 'integer|exists:employees,id',
        ]);
        $result = $this->leave->initialiseYear((int) $data['year'], $data['employee_ids'] ?? null, $request->boolean('overwrite_custom'));

        return $this->sendResponse($result, sprintf('Leave year %d set up: %d created, %d updated, %d kept (set by hand).',
            $data['year'], $result['created'], $result['updated'], $result['skipped']));
    }

    public function employeeYear(Employee $employee, int $year): array
    {
        $requests = LeaveRequest::with(['leaveType', 'approver', 'employee'])
            ->where('employee_id', $employee->id)
            ->whereYear('from_date', $year)
            ->orderByDesc('from_date')
            ->get()
            ->map(fn (LeaveRequest $r) => array_merge(['id' => $r->id], $r->prepareAttributes()))
            ->values();

        return [
            'employee_id' => $employee->id,
            'year' => $year,
            'balances' => $this->leave->balances($employee, $year),
            'requests' => $requests,
        ];
    }

    private function year(Request $request): int
    {
        return (int) ($request->get('year') ?: Carbon::parse(HrSetting::today())->year);
    }
}
