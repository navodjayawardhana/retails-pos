<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Http\Resources\LeaveTypeCollection;
use App\Http\Resources\LeaveTypeResource;
use App\Models\LeaveType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveTypeAPIController extends AppBaseController
{
    /**
     * ?page[size]=0 returns all (dropdowns). Filters: active=1, filter[search].
     */
    public function index(Request $request): LeaveTypeCollection
    {
        $query = LeaveType::query();
        if ($request->boolean('active')) {
            $query->where('is_active', true);
        }
        $search = $request->input('filter.search');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%'.$search.'%')->orWhere('code', 'like', '%'.$search.'%');
            });
        }
        $sort = (string) $request->get('sort', '');
        $field = ltrim($sort, '-');
        if (in_array($field, ['name', 'code', 'default_days_per_year'], true)) {
            $query->orderBy($field, str_starts_with($sort, '-') ? 'desc' : 'asc');
        }
        $query->orderBy('id');

        $perPage = (int) getPageSize($request);
        $types = $query->paginate($perPage > 0 ? $perPage : max(1, (clone $query)->count()));
        LeaveTypeResource::usingWithCollection();

        return new LeaveTypeCollection($types);
    }

    public function store(Request $request): LeaveTypeResource
    {
        $request->validate(LeaveType::rules(), $this->messages());

        return new LeaveTypeResource(LeaveType::create($this->input($request)));
    }

    public function show($id): LeaveTypeResource
    {
        return new LeaveTypeResource(LeaveType::findOrFail($id));
    }

    public function update(Request $request, $id): LeaveTypeResource
    {
        $type = LeaveType::findOrFail($id);
        $request->validate(LeaveType::rules((int) $id), $this->messages());
        $type->update($this->input($request));

        return new LeaveTypeResource($type->fresh());
    }

    public function destroy($id): JsonResponse
    {
        $type = LeaveType::findOrFail($id);
        if ($type->leaveRequests()->exists()) {
            return $this->sendError('This leave type has leave requests. Turn it off (inactive) instead of deleting it.');
        }
        $type->delete();

        return $this->sendSuccess('Leave type deleted successfully');
    }

    private function input(Request $request): array
    {
        $unlimited = $request->boolean('is_unlimited');
        $carry = ! $unlimited && $request->boolean('carry_forward');
        $gender = $request->get('gender');

        return [
            'name' => $request->get('name'),
            'code' => strtoupper((string) $request->get('code')),
            'default_days_per_year' => $unlimited ? 0 : (float) $request->get('default_days_per_year', 0),
            'is_unlimited' => $unlimited,
            'is_paid' => $request->has('is_paid') ? $request->boolean('is_paid') : true,
            'allow_half_day' => $request->has('allow_half_day') ? $request->boolean('allow_half_day') : true,
            'carry_forward' => $carry,
            'max_carry_forward_days' => $carry && $request->filled('max_carry_forward_days') ? (float) $request->get('max_carry_forward_days') : null,
            'requires_document' => $request->boolean('requires_document'),
            'gender' => in_array($gender, ['male', 'female'], true) ? $gender : null,
            'color' => $request->get('color') ?: '#1E3A8A',
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : true,
            'description' => $request->get('description'),
        ];
    }

    private function messages(): array
    {
        return [
            'name.unique' => 'A leave type with this name already exists.',
            'code.unique' => 'A leave type with this code already exists.',
            'default_days_per_year.required_unless' => 'Enter the days per year, or mark the type as unlimited.',
            'color.regex' => 'Colour must be a hex value like #1E3A8A.',
        ];
    }
}
