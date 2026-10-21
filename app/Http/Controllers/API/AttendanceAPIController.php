<?php

namespace App\Http\Controllers\API;

use App\Exports\AttendanceMonthlyExport;
use App\Http\Controllers\AppBaseController;
use App\Http\Resources\AttendanceCollection;
use App\Http\Resources\AttendanceResource;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\HrSetting;
use App\Services\Hrm\AttendanceImportService;
use App\Services\Hrm\AttendanceService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class AttendanceAPIController extends AppBaseController
{
    private AttendanceService $attendance;

    public function __construct(AttendanceService $attendance)
    {
        $this->attendance = $attendance;
    }

    /**
     * Filters: date, date_from, date_to, employee_id, warehouse_id, department_id, status, filter[search].
     */
    public function index(Request $request): AttendanceCollection
    {
        $query = Attendance::with(['employee.warehouse', 'employee.department']);
        if ($request->filled('date')) {
            $query->whereDate('date', $request->get('date'));
        }
        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->get('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->get('date_to'));
        }
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->get('employee_id'));
        }
        if ($request->filled('status') && $request->get('status') !== '0') {
            $query->where('status', $request->get('status'));
        }
        foreach (['warehouse_id', 'department_id'] as $filter) {
            if ($request->filled($filter) && $request->get($filter) !== '0') {
                $value = $request->get($filter);
                $query->whereHas('employee', fn ($q) => $q->where($filter, $value));
            }
        }
        $search = $request->input('filter.search');
        if ($search) {
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('employee_code', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%");
            });
        }
        $query->orderByDesc('date')->orderBy('employee_id');

        $perPage = (int) getPageSize($request);
        $records = $query->paginate($perPage > 0 ? $perPage : max(1, (clone $query)->count()));
        AttendanceResource::usingWithCollection();

        return new AttendanceCollection($records);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateRecord($request, true);
        if ($error = $this->modeError('attendance_manual')) {
            return $error;
        }
        $employee = Employee::findOrFail($data['employee_id']);
        $record = $this->attendance->record($employee, $data['date'], $data['clock_in'] ?? null, $data['clock_out'] ?? null,
            'manual', $data['status'] ?? null, $data['notes'] ?? null, Auth::id());

        return $this->sendResponse((new AttendanceResource($record))->toArray($request), 'Attendance saved successfully');
    }

    public function update(Request $request, $id): JsonResponse
    {
        $data = $this->validateRecord($request, false);
        /** @var Attendance $existing */
        $existing = Attendance::with('employee')->findOrFail($id);
        $record = $this->attendance->record($existing->employee, $existing->date->format('Y-m-d'),
            $data['clock_in'] ?? null, $data['clock_out'] ?? null, 'manual', $data['status'] ?? null,
            $data['notes'] ?? null, Auth::id());

        return $this->sendResponse((new AttendanceResource($record))->toArray($request), 'Attendance updated successfully');
    }

    public function destroy($id): JsonResponse
    {
        Attendance::findOrFail($id)->delete();

        return $this->sendSuccess('Attendance deleted successfully');
    }

    /**
     * GET attendance-sheet?date=&warehouse_id=&department_id= — rows for the manual entry grid.
     */
    public function sheet(Request $request): JsonResponse
    {
        $date = $request->filled('date') ? Carbon::parse($request->get('date'))->toDateString() : HrSetting::today();

        return $this->sendResponse([
            'date' => $date,
            'rows' => $this->attendance->dailyReport($date, $request->only(['warehouse_id', 'department_id'])),
        ], 'Attendance sheet retrieved successfully');
    }

    /**
     * POST attendances/bulk {date, records: [{employee_id, status, clock_in, clock_out, notes}]}
     * A row with no status and no times clears that employee's record for the date.
     */
    public function bulkStore(Request $request): JsonResponse
    {
        if ($error = $this->modeError('attendance_manual')) {
            return $error;
        }
        $data = $request->validate([
            'date' => 'required|date',
            'records' => 'required|array',
            'records.*.employee_id' => 'required|integer|exists:employees,id',
            'records.*.status' => 'nullable|in:present,late,half_day,absent,leave,holiday,weekend,unmarked',
            'records.*.clock_in' => 'nullable|string|max:20',
            'records.*.clock_out' => 'nullable|string|max:20',
            'records.*.notes' => 'nullable|string|max:1000',
        ]);
        $date = Carbon::parse($data['date'])->toDateString();
        $saved = 0;
        $cleared = 0;

        DB::transaction(function () use ($data, $date, &$saved, &$cleared) {
            $employees = Employee::whereIn('id', collect($data['records'])->pluck('employee_id'))->get()->keyBy('id');
            foreach ($data['records'] as $row) {
                $status = $row['status'] ?? null;
                $status = $status === 'unmarked' ? null : $status;
                $in = $row['clock_in'] ?? null;
                $out = $row['clock_out'] ?? null;
                if (! $status && ! $in && ! $out) {
                    $cleared += Attendance::where('employee_id', $row['employee_id'])->whereDate('date', $date)->delete();
                    continue;
                }
                $this->attendance->record($employees[$row['employee_id']], $date, $in, $out, 'manual',
                    $status, $row['notes'] ?? null, Auth::id());
                $saved++;
            }
        });

        return $this->sendResponse(['saved' => $saved, 'cleared' => $cleared], 'Attendance saved successfully');
    }

    /**
     * POST attendance-import/preview (multipart file=csv)
     */
    public function importPreview(Request $request, AttendanceImportService $importer): JsonResponse
    {
        if ($error = $this->modeError('attendance_device_import')) {
            return $error;
        }
        $request->validate(['file' => 'required|file|max:5120'], ['file.required' => 'Choose a CSV file.']);
        $extension = strtolower($request->file('file')->getClientOriginalExtension());
        if (! in_array($extension, ['csv', 'txt'], true)) {
            return $this->sendError('Upload a .csv file.');
        }
        $result = $importer->parse($request->file('file')->getRealPath());
        if (! empty($result['message'])) {
            return $this->sendError($result['message']);
        }

        return $this->sendResponse($result, 'File parsed successfully');
    }

    /**
     * POST attendance-import/commit {records: [{employee_id, date, clock_in, clock_out}]}
     */
    public function importCommit(Request $request): JsonResponse
    {
        if ($error = $this->modeError('attendance_device_import')) {
            return $error;
        }
        $data = $request->validate([
            'records' => 'required|array|min:1',
            'records.*.employee_id' => 'required|integer|exists:employees,id',
            'records.*.date' => 'required|date',
            'records.*.clock_in' => 'nullable|string|max:20',
            'records.*.clock_out' => 'nullable|string|max:20',
        ], ['records.required' => 'There are no valid rows to import.']);

        $imported = 0;
        DB::transaction(function () use ($data, &$imported) {
            $employees = Employee::whereIn('id', collect($data['records'])->pluck('employee_id'))->get()->keyBy('id');
            foreach ($data['records'] as $row) {
                if (empty($row['clock_in']) && empty($row['clock_out'])) {
                    continue;
                }
                $this->attendance->record($employees[$row['employee_id']], $row['date'], $row['clock_in'] ?? null,
                    $row['clock_out'] ?? null, 'device_import', null, null, Auth::id());
                $imported++;
            }
        });

        return $this->sendResponse(['imported' => $imported], $imported.' attendance record(s) imported');
    }

    /**
     * GET attendance-summary?employee_id=&month=YYYY-MM — employee tab data.
     */
    public function summary(Request $request): JsonResponse
    {
        $request->validate(['employee_id' => 'required|exists:employees,id', 'month' => 'nullable|date_format:Y-m']);
        $employee = Employee::findOrFail($request->get('employee_id'));

        return $this->sendResponse($this->employeeMonth($employee, $request->get('month')),
            'Attendance summary retrieved successfully');
    }

    /**
     * GET attendance-reports/daily?date=&warehouse_id=&department_id=
     */
    public function dailyReport(Request $request): JsonResponse
    {
        $date = $request->filled('date') ? Carbon::parse($request->get('date'))->toDateString() : HrSetting::today();
        $rows = $this->attendance->dailyReport($date, $request->only(['warehouse_id', 'department_id']));
        $counts = array_count_values(array_filter(array_column($rows, 'status')));

        return $this->sendResponse(['date' => $date, 'rows' => $rows, 'counts' => $counts],
            'Daily attendance retrieved successfully');
    }

    /**
     * GET attendance-reports/monthly?month=YYYY-MM&warehouse_id=&department_id=
     */
    public function monthlyReport(Request $request): JsonResponse
    {
        [$year, $month] = $this->monthParts($request->get('month'));

        return $this->sendResponse(
            $this->attendance->monthlySheet($year, $month, $request->only(['warehouse_id', 'department_id'])),
            'Monthly attendance retrieved successfully'
        );
    }

    /**
     * GET attendance-reports/monthly-excel?month=&warehouse_id=&department_id= — returns a download URL.
     */
    public function monthlyExcel(Request $request): JsonResponse
    {
        [$year, $month] = $this->monthParts($request->get('month'));
        $sheet = $this->attendance->monthlySheet($year, $month, $request->only(['warehouse_id', 'department_id']));
        $path = 'excel/attendance-'.sprintf('%04d-%02d', $year, $month).'.xlsx';
        if (Storage::exists($path)) {
            Storage::delete($path);
        }
        Excel::store(new AttendanceMonthlyExport($sheet), $path);

        return $this->sendResponse(['attendance_excel_url' => Storage::url($path)], 'Attendance export created successfully');
    }

    // ---------- helpers shared with MyAttendanceAPIController ----------

    public function employeeMonth(Employee $employee, ?string $month): array
    {
        [$year, $monthNo] = $this->monthParts($month);
        $from = Carbon::create($year, $monthNo, 1)->toDateString();
        $to = Carbon::create($year, $monthNo, 1)->endOfMonth()->toDateString();
        $records = Attendance::where('employee_id', $employee->id)
            ->whereDate('date', '>=', $from)->whereDate('date', '<=', $to)
            ->orderBy('date')->get();
        $assignment = $this->attendance->schedule()->activeShiftAssignment($employee, HrSetting::today());
        $today = $this->attendance->schedule()->forDate($employee, HrSetting::today());

        return [
            'month' => sprintf('%04d-%02d', $year, $monthNo),
            'employee' => [
                'id' => $employee->id,
                'employee_code' => $employee->employee_code,
                'full_name' => $employee->full_name,
            ],
            'current_shift' => $assignment ? $assignment->toApiArray() : null,
            'today_schedule' => [
                'start' => $today['start'],
                'end' => $today['end'],
                'is_working_day' => $today['is_working_day'],
                'holiday' => $today['holiday'] ? $today['holiday']->name : null,
            ],
            'summary' => $this->attendance->summary($employee, $from, $to, $records),
            'records' => $records->map(fn ($r) => array_merge(['id' => $r->id], $r->prepareAttributes()))->values(),
        ];
    }

    private function monthParts(?string $month): array
    {
        if ($month && preg_match('/^(\d{4})-(\d{2})$/', $month, $m)) {
            return [(int) $m[1], (int) $m[2]];
        }

        $now = HrSetting::now();

        return [(int) $now->year, (int) $now->month];
    }

    private function validateRecord(Request $request, bool $isCreate): array
    {
        $rules = [
            'clock_in' => 'nullable|string|max:20',
            'clock_out' => 'nullable|string|max:20',
            'status' => 'nullable|in:present,late,half_day,absent,leave,holiday,weekend',
            'notes' => 'nullable|string|max:1000',
        ];
        if ($isCreate) {
            $rules['employee_id'] = 'required|exists:employees,id';
            $rules['date'] = 'required|date';
        }

        return $request->validate($rules);
    }

    private function modeError(string $settingKey): ?JsonResponse
    {
        if (! HrSetting::get($settingKey)) {
            $labels = [
                'attendance_manual' => 'Manual attendance entry',
                'attendance_device_import' => 'Device import',
            ];

            return $this->sendError(($labels[$settingKey] ?? 'This option').' is turned off in HR Settings.');
        }

        return null;
    }
}
