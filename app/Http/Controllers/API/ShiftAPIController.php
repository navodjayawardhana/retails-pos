<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Http\Requests\CreateShiftRequest;
use App\Http\Requests\UpdateShiftRequest;
use App\Http\Resources\ShiftCollection;
use App\Http\Resources\ShiftResource;
use App\Models\EmployeeShift;
use App\Models\HrSetting;
use App\Models\Shift;
use App\Repositories\ShiftRepository;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShiftAPIController extends AppBaseController
{
    private ShiftRepository $shiftRepository;

    private const FIELDS = [
        'name', 'start_time', 'end_time', 'break_minutes', 'late_grace_minutes',
        'half_day_hours', 'is_night_shift', 'weekly_off_days', 'description',
    ];

    public function __construct(ShiftRepository $shiftRepository)
    {
        $this->shiftRepository = $shiftRepository;
    }

    public function index(Request $request): ShiftCollection
    {
        $shifts = $this->shiftRepository->paginate(getPageSize($request));
        ShiftResource::usingWithCollection();

        return new ShiftCollection($shifts);
    }

    public function store(CreateShiftRequest $request): ShiftResource
    {
        return new ShiftResource($this->shiftRepository->create($this->input($request)));
    }

    public function show($id): ShiftResource
    {
        return new ShiftResource(Shift::findOrFail($id));
    }

    public function update(UpdateShiftRequest $request, $id): ShiftResource
    {
        return new ShiftResource($this->shiftRepository->update($this->input($request), $id));
    }

    public function destroy($id): JsonResponse
    {
        $shift = Shift::findOrFail($id);
        $today = HrSetting::today();
        $inUse = $shift->employeeShifts()->where(function ($q) use ($today) {
            $q->whereNull('to_date')->orWhereDate('to_date', '>=', $today);
        })->exists();
        if ($inUse) {
            return $this->sendError('Shift can\'t be deleted because employees are assigned to it. End or remove those assignments first.');
        }
        $shift->delete();

        return $this->sendSuccess('Shift deleted successfully');
    }

    /**
     * GET shift-assignments?employee_id=&shift_id=&current=1
     */
    public function assignments(Request $request): JsonResponse
    {
        $query = EmployeeShift::with(['shift', 'employee'])->orderByDesc('from_date')->orderByDesc('id');
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->get('employee_id'));
        }
        if ($request->filled('shift_id')) {
            $query->where('shift_id', $request->get('shift_id'));
        }
        if ($request->boolean('current')) {
            $today = HrSetting::today();
            $query->whereDate('from_date', '<=', $today)->where(function ($q) use ($today) {
                $q->whereNull('to_date')->orWhereDate('to_date', '>=', $today);
            });
        }

        return $this->sendResponse(
            $query->limit(500)->get()->map->toApiArray()->values(),
            'Shift assignments retrieved successfully'
        );
    }

    /**
     * POST shift-assignments {shift_id, employee_ids[], from_date, to_date?}
     * Open/overlapping earlier assignments of those employees are ended the day before from_date.
     */
    public function assign(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shift_id' => 'required|exists:shifts,id',
            'employee_ids' => 'required|array|min:1',
            'employee_ids.*' => 'integer|exists:employees,id',
            'from_date' => 'required|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
        ], [
            'employee_ids.required' => 'Select at least one employee.',
        ]);

        $from = Carbon::parse($data['from_date'])->toDateString();
        $dayBefore = Carbon::parse($from)->subDay()->toDateString();

        DB::transaction(function () use ($data, $from, $dayBefore) {
            foreach (array_unique($data['employee_ids']) as $employeeId) {
                EmployeeShift::where('employee_id', $employeeId)
                    ->whereDate('from_date', '<', $from)
                    ->where(function ($q) use ($from) {
                        $q->whereNull('to_date')->orWhereDate('to_date', '>=', $from);
                    })
                    ->update(['to_date' => $dayBefore]);
                EmployeeShift::where('employee_id', $employeeId)->whereDate('from_date', $from)->delete();
                EmployeeShift::create([
                    'employee_id' => $employeeId,
                    'shift_id' => $data['shift_id'],
                    'from_date' => $from,
                    'to_date' => $data['to_date'] ?? null,
                ]);
            }
        });

        return $this->sendSuccess('Shift assigned successfully');
    }

    public function removeAssignment($id): JsonResponse
    {
        EmployeeShift::findOrFail($id)->delete();

        return $this->sendSuccess('Shift assignment removed successfully');
    }

    private function input(Request $request): array
    {
        $input = $request->only(self::FIELDS);
        $input['is_night_shift'] = $request->boolean('is_night_shift');
        $input['break_minutes'] = (int) ($input['break_minutes'] ?? 0);
        foreach (['late_grace_minutes', 'half_day_hours'] as $nullable) {
            if (array_key_exists($nullable, $input) && ($input[$nullable] === '' || $input[$nullable] === null)) {
                $input[$nullable] = null;
            }
        }
        if (array_key_exists('weekly_off_days', $input)) {
            $input['weekly_off_days'] = is_array($input['weekly_off_days'])
                ? array_values(array_map('intval', $input['weekly_off_days'])) : null;
        }

        return $input;
    }
}
