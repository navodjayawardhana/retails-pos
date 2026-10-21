<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Http\Requests\CreateDepartmentRequest;
use App\Http\Requests\UpdateDepartmentRequest;
use App\Http\Resources\DepartmentCollection;
use App\Http\Resources\DepartmentResource;
use App\Models\Department;
use App\Repositories\DepartmentRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentAPIController extends AppBaseController
{
    private DepartmentRepository $departmentRepository;

    public function __construct(DepartmentRepository $departmentRepository)
    {
        $this->departmentRepository = $departmentRepository;
    }

    public function index(Request $request): DepartmentCollection
    {
        $perPage = getPageSize($request);
        $departments = $this->departmentRepository->paginate($perPage);
        DepartmentResource::usingWithCollection();

        return new DepartmentCollection($departments);
    }

    public function store(CreateDepartmentRequest $request): DepartmentResource
    {
        $department = $this->departmentRepository->create($request->only(['name', 'description']));

        return new DepartmentResource($department);
    }

    public function show($id): DepartmentResource
    {
        return new DepartmentResource($this->departmentRepository->find($id));
    }

    public function update(UpdateDepartmentRequest $request, $id): DepartmentResource
    {
        $department = $this->departmentRepository->update($request->only(['name', 'description']), $id);

        return new DepartmentResource($department);
    }

    public function destroy($id): JsonResponse
    {
        /** @var Department $department */
        $department = Department::findOrFail($id);
        if ($department->employees()->exists()) {
            return $this->sendError('Department can\'t be deleted because it has employees.');
        }
        $department->delete();

        return $this->sendSuccess('Department deleted successfully');
    }
}
