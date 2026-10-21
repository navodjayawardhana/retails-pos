<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Http\Requests\CreateHolidayRequest;
use App\Http\Requests\UpdateHolidayRequest;
use App\Http\Resources\HolidayCollection;
use App\Http\Resources\HolidayResource;
use App\Models\Holiday;
use App\Repositories\HolidayRepository;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HolidayAPIController extends AppBaseController
{
    private HolidayRepository $holidayRepository;

    public function __construct(HolidayRepository $holidayRepository)
    {
        $this->holidayRepository = $holidayRepository;
    }

    /**
     * Filters: year, month, type, warehouse_id (also includes all-branch holidays).
     */
    public function index(Request $request): HolidayCollection
    {
        // plain query: prettus repository __call does not keep chained where() calls
        $query = Holiday::with('warehouse');
        if ($request->filled('year')) {
            $query->whereYear('date', $request->get('year'));
        }
        if ($request->filled('month')) {
            $query->whereMonth('date', $request->get('month'));
        }
        if ($request->filled('type') && $request->get('type') !== '0') {
            $query->where('type', $request->get('type'));
        }
        if ($request->filled('warehouse_id') && $request->get('warehouse_id') !== '0') {
            $warehouseId = $request->get('warehouse_id');
            $query->where(function ($q) use ($warehouseId) {
                $q->whereNull('warehouse_id')->orWhere('warehouse_id', $warehouseId);
            });
        }
        $search = $request->input('filter.search');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%'.$search.'%')->orWhere('type', 'like', '%'.$search.'%');
            });
        }
        // table sends sort=field / sort=-field; its default (-created_at) shows holidays by date
        $sort = (string) $request->get('sort', '');
        $field = ltrim($sort, '-');
        if (in_array($field, ['date', 'name', 'type'], true)) {
            $query->orderBy($field, str_starts_with($sort, '-') ? 'desc' : 'asc');
        }
        $query->orderBy('date')->orderBy('name');

        $perPage = (int) getPageSize($request);
        $holidays = $query->paginate($perPage > 0 ? $perPage : max(1, (clone $query)->count()));
        HolidayResource::usingWithCollection();

        return new HolidayCollection($holidays);
    }

    public function store(CreateHolidayRequest $request): HolidayResource
    {
        return new HolidayResource($this->holidayRepository->create($this->input($request)));
    }

    public function show($id): HolidayResource
    {
        return new HolidayResource(Holiday::findOrFail($id));
    }

    public function update(UpdateHolidayRequest $request, $id): HolidayResource
    {
        return new HolidayResource($this->holidayRepository->update($this->input($request), $id));
    }

    public function destroy($id): JsonResponse
    {
        Holiday::findOrFail($id)->delete();

        return $this->sendSuccess('Holiday deleted successfully');
    }

    /**
     * POST holidays/bulk {name, type, is_paid, warehouse_id?, dates[]} — one row per date,
     * skipping dates that already have a holiday with the same name for the same branch.
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|max:191',
            'type' => 'required|in:poya,public,mercantile,company',
            'is_paid' => 'nullable|boolean',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'dates' => 'required|array|min:1',
            'dates.*' => 'required|date',
        ], [
            'dates.required' => 'Add at least one date.',
        ]);

        $created = 0;
        DB::transaction(function () use ($data, $request, &$created) {
            foreach (array_unique($data['dates']) as $date) {
                $date = Carbon::parse($date)->toDateString();
                $exists = Holiday::whereDate('date', $date)
                    ->where('name', $data['name'])
                    ->where('warehouse_id', $data['warehouse_id'] ?? null)
                    ->exists();
                if ($exists) {
                    continue;
                }
                Holiday::create([
                    'name' => $data['name'],
                    'date' => $date,
                    'type' => $data['type'],
                    'is_paid' => $request->has('is_paid') ? $request->boolean('is_paid') : true,
                    'warehouse_id' => $data['warehouse_id'] ?? null,
                ]);
                $created++;
            }
        });

        return $this->sendResponse(['created' => $created], $created.' holiday(s) added successfully');
    }

    private function input(Request $request): array
    {
        $input = $request->only(['name', 'date', 'type', 'warehouse_id']);
        $input['is_paid'] = $request->has('is_paid') ? $request->boolean('is_paid') : true;
        if (empty($input['warehouse_id']) || $input['warehouse_id'] === '0') {
            $input['warehouse_id'] = null;
        }

        return $input;
    }
}
