<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Http\Resources\SalaryComponentCollection;
use App\Http\Resources\SalaryComponentResource;
use App\Models\SalaryComponent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalaryComponentAPIController extends AppBaseController
{
    /**
     * ?page[size]=0 returns all. Filters: active=1, type=earning|deduction, filter[search].
     */
    public function index(Request $request): SalaryComponentCollection
    {
        $query = SalaryComponent::query();
        if ($request->boolean('active')) {
            $query->where('is_active', true);
        }
        if (in_array($request->get('type'), [SalaryComponent::TYPE_EARNING, SalaryComponent::TYPE_DEDUCTION], true)) {
            $query->where('type', $request->get('type'));
        }
        $search = $request->input('filter.search');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%'.$search.'%')->orWhere('code', 'like', '%'.$search.'%');
            });
        }
        $sort = (string) $request->get('sort', '');
        $field = ltrim($sort, '-');
        if (in_array($field, ['name', 'code', 'type', 'default_value'], true)) {
            $query->orderBy($field, str_starts_with($sort, '-') ? 'desc' : 'asc');
        }
        $query->orderBy('type')->orderBy('name');

        $perPage = (int) getPageSize($request);
        $items = $query->paginate($perPage > 0 ? $perPage : max(1, (clone $query)->count()));
        SalaryComponentResource::usingWithCollection();

        return new SalaryComponentCollection($items);
    }

    public function store(Request $request): SalaryComponentResource
    {
        $request->validate(SalaryComponent::rules(), $this->messages());

        return new SalaryComponentResource(SalaryComponent::create($this->input($request)));
    }

    public function show($id): SalaryComponentResource
    {
        return new SalaryComponentResource(SalaryComponent::findOrFail($id));
    }

    public function update(Request $request, $id): SalaryComponentResource
    {
        $component = SalaryComponent::findOrFail($id);
        $request->validate(SalaryComponent::rules((int) $id), $this->messages());
        $component->update($this->input($request));

        return new SalaryComponentResource($component->fresh());
    }

    public function destroy($id): JsonResponse
    {
        $component = SalaryComponent::findOrFail($id);
        if ($component->employeeComponents()->exists()) {
            return $this->sendError('This component is used in employee salary structures. Turn it off (inactive) instead of deleting it.');
        }
        $component->delete();

        return $this->sendSuccess('Salary component deleted successfully');
    }

    private function input(Request $request): array
    {
        $type = $request->get('type');

        return [
            'name' => $request->get('name'),
            'code' => strtoupper((string) $request->get('code')),
            'type' => $type,
            'calculation' => $request->get('calculation'),
            'default_value' => (float) $request->get('default_value', 0),
            'epf_liable' => $type === SalaryComponent::TYPE_EARNING && $request->boolean('epf_liable'),
            'taxable' => $request->boolean('taxable'),
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : true,
            'description' => $request->get('description'),
        ];
    }

    private function messages(): array
    {
        return [
            'name.unique' => 'A salary component with this name already exists.',
            'code.unique' => 'A salary component with this code already exists.',
        ];
    }
}
