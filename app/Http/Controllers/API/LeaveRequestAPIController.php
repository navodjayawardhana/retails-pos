<?php

namespace App\Http\Controllers\API;

use App\Exports\LeaveBalanceExport;
use App\Http\Controllers\AppBaseController;
use App\Http\Resources\LeaveRequestCollection;
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
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class LeaveRequestAPIController extends AppBaseController
{
    private LeaveService $leave;

    public function __construct(LeaveService $leave)
    {
        $this->leave = $leave;
    }

    /**
     * Filters: status, leave_type_id, employee_id, warehouse_id, department_id, date_from, date_to,
     * filter[search] (employee code/name).
     */
    public function index(Request $request): LeaveRequestCollection
    {
        $query = LeaveRequest::with(['employee.warehouse', 'employee.department', 'leaveType', 'approver', 'media']);
        foreach (['status', 'leave_type_id', 'employee_id'] as $field) {
            if ($request->filled($field) && $request->get($field) !== '0') {
                $query->where($field, $request->get($field));
            }
        }
        $warehouseId = $request->get('warehouse_id');
        $departmentId = $request->get('department_id');
        if (($warehouseId && $warehouseId !== '0') || ($departmentId && $departmentId !== '0')) {
            $query->whereHas('employee', function ($q) use ($warehouseId, $departmentId) {
                if ($warehouseId && $warehouseId !== '0') {
                    $q->where('warehouse_id', $warehouseId);
                }
                if ($departmentId && $departmentId !== '0') {
                    $q->where('department_id', $departmentId);
                }
            });
        }
        if ($request->filled('date_from') || $request->filled('date_to')) {
            $query->overlapping($request->get('date_from', '1900-01-01'), $request->get('date_to', '2999-12-31'));
        }
        $search = $request->input('filter.search');
        if ($search) {
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('employee_code', 'like', '%'.$search.'%')
                    ->orWhere('first_name', 'like', '%'.$search.'%')
                    ->orWhere('last_name', 'like', '%'.$search.'%');
            });
        }
        $sort = (string) $request->get('sort', '');
        $field = ltrim($sort, '-');
        if (in_array($field, ['from_date', 'days', 'status', 'created_at'], true)) {
            $query->orderBy($field, str_starts_with($sort, '-') ? 'desc' : 'asc');
        } else {
            $query->orderByDesc('from_date');
        }

        $perPage = (int) getPageSize($request);
        $requests = $query->paginate($perPage > 0 ? $perPage : max(1, (clone $query)->count()));
        LeaveRequestResource::usingWithCollection();

        return new LeaveRequestCollection($requests);
    }

    /**
     * Apply on behalf of an employee (multipart). approve_now=1 approves straight away.
     */
    public function store(Request $request): LeaveRequestResource
    {
        $data = $this->validated($request, true);
        $leave = $this->leave->apply($data, Auth::id(), $request->file('attachment'), $request->boolean('approve_now'));

        return new LeaveRequestResource($leave);
    }

    public function show($id): LeaveRequestResource
    {
        return new LeaveRequestResource(LeaveRequest::with(['employee', 'leaveType', 'approver'])->findOrFail($id));
    }

    public function destroy($id): JsonResponse
    {
        $this->leave->delete(LeaveRequest::findOrFail($id));

        return $this->sendSuccess('Leave request deleted successfully');
    }

    public function approve(Request $request, $id): JsonResponse
    {
        $leave = $this->leave->approve(LeaveRequest::findOrFail($id), Auth::id(), $request->get('remarks'));
        $message = 'Leave approved';
        if ($leave->conflict_dates) {
            $message .= '. Attendance was kept on '.implode(', ', $leave->conflict_dates).' because the employee had already clocked in.';
        }

        return $this->sendResponse(new LeaveRequestResource($leave), $message);
    }

    public function reject(Request $request, $id): JsonResponse
    {
        $leave = $this->leave->reject(LeaveRequest::findOrFail($id), Auth::id(), $request->get('remarks'));

        return $this->sendResponse(new LeaveRequestResource($leave), 'Leave rejected');
    }

    public function cancel(Request $request, $id): JsonResponse
    {
        $leave = $this->leave->cancel(LeaveRequest::findOrFail($id), Auth::id(), $request->get('remarks'));

        return $this->sendResponse(new LeaveRequestResource($leave), 'Leave cancelled');
    }

    /**
     * GET leave-preview?employee_id=&leave_type_id=&from_date=&to_date=&is_half_day= — working days
     * the request would take and the current balance; never fails (returns `error` instead).
     */
    public function preview(Request $request): JsonResponse
    {
        return $this->sendResponse($this->previewFor(
            Employee::find($request->get('employee_id')),
            $request
        ), 'Preview');
    }

    public function previewFor(?Employee $employee, Request $request): array
    {
        $type = LeaveType::find($request->get('leave_type_id'));
        if (! $employee || ! $type || ! $request->filled('from_date')) {
            return ['days' => 0, 'balance' => null, 'error' => null];
        }
        $isHalfDay = $request->boolean('is_half_day');
        $from = $request->get('from_date');
        $to = $isHalfDay ? $from : ($request->get('to_date') ?: $from);
        $year = (int) Carbon::parse($from)->year;
        $balance = collect($this->leave->balances($employee, $year))->firstWhere('leave_type_id', $type->id);
        try {
            $days = $this->leave->validateRequest($employee, $type, $from, $to, $isHalfDay,
                $isHalfDay ? ($request->get('half_session') ?: 'first') : null);
            $error = null;
        } catch (\Throwable $e) {
            $days = $this->leave->countDays($employee, $from, $to, $isHalfDay);
            $error = $e->getMessage();
        }

        return [
            'days' => $days,
            'balance' => $balance ? $balance['balance'] : null,
            'pending' => $balance ? $balance['pending'] : 0,
            'is_unlimited' => $type->is_unlimited,
            'requires_document' => $type->requires_document,
            'error' => $error,
        ];
    }

    /**
     * GET leave-calendar?month=YYYY-MM&warehouse_id=&department_id=
     */
    public function calendar(Request $request): JsonResponse
    {
        [$year, $month] = $this->monthParts($request->get('month'));
        $from = Carbon::create($year, $month, 1)->toDateString();
        $to = Carbon::create($year, $month, 1)->endOfMonth()->toDateString();
        $items = $this->leave->calendar($from, $to, $request->only(['warehouse_id', 'department_id']))
            ->map(fn (LeaveRequest $r) => array_merge(['id' => $r->id], $r->prepareAttributes()))
            ->values();

        return $this->sendResponse([
            'year' => $year,
            'month' => $month,
            'from' => $from,
            'to' => $to,
            'items' => $items,
        ], 'Leave calendar retrieved successfully');
    }

    /**
     * GET leave-reports/balances?year=&warehouse_id=&department_id=
     */
    public function balanceReport(Request $request): JsonResponse
    {
        $year = (int) ($request->get('year') ?: Carbon::parse(HrSetting::today())->year);

        return $this->sendResponse($this->leave->balanceReport($year, $request->only(['warehouse_id', 'department_id'])),
            'Leave balances retrieved successfully');
    }

    /**
     * GET leave-reports/balances-excel — returns a download URL.
     */
    public function balanceExcel(Request $request): JsonResponse
    {
        $year = (int) ($request->get('year') ?: Carbon::parse(HrSetting::today())->year);
        $report = $this->leave->balanceReport($year, $request->only(['warehouse_id', 'department_id']));
        $path = 'excel/leave-balances-'.$year.'.xlsx';
        if (Storage::exists($path)) {
            Storage::delete($path);
        }
        Excel::store(new LeaveBalanceExport($report), $path);

        return $this->sendResponse(['leave_excel_url' => Storage::url($path)], 'Leave balance export created successfully');
    }

    public function validated(Request $request, bool $withEmployee): array
    {
        $rules = [
            'leave_type_id' => 'required|exists:leave_types,id',
            'from_date' => 'required|date',
            'to_date' => 'nullable|date',
            'is_half_day' => 'nullable',
            'half_session' => 'nullable|in:first,second',
            'reason' => 'nullable|max:2000',
            'attachment' => 'nullable|file|max:5120|mimes:jpg,jpeg,png,pdf,webp',
        ];
        if ($withEmployee) {
            $rules['employee_id'] = 'required|exists:employees,id';
        }

        return $request->validate($rules, [
            'employee_id.required' => 'Choose an employee.',
            'leave_type_id.required' => 'Choose a leave type.',
            'from_date.required' => 'Choose the start date.',
            'attachment.mimes' => 'The document must be a JPG, PNG, WEBP or PDF file.',
            'attachment.max' => 'The document must be 5 MB or smaller.',
        ]);
    }

    private function monthParts(?string $month): array
    {
        if ($month && preg_match('/^(\d{4})-(\d{2})$/', $month, $m)) {
            return [(int) $m[1], (int) $m[2]];
        }
        $today = Carbon::parse(HrSetting::today());

        return [(int) $today->year, (int) $today->month];
    }
}
