<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Http\Requests\CreateEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Http\Resources\EmployeeCollection;
use App\Http\Resources\EmployeeResource;
use App\Models\Employee;
use App\Repositories\EmployeeRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeAPIController extends AppBaseController
{
    private EmployeeRepository $employeeRepository;

    public function __construct(EmployeeRepository $employeeRepository)
    {
        $this->employeeRepository = $employeeRepository;
    }

    /**
     * Filters: department_id, designation_id, warehouse_id (branch), status; filter[search] via repository.
     */
    public function index(Request $request): EmployeeCollection
    {
        $perPage = getPageSize($request);
        $employees = $this->employeeRepository;
        foreach (['department_id', 'designation_id', 'warehouse_id', 'status'] as $filter) {
            if ($request->filled($filter) && $request->get($filter) !== '0') {
                $employees->where($filter, $request->get($filter));
            }
        }
        $employees = $employees->paginate($perPage);
        EmployeeResource::usingWithCollection();

        return new EmployeeCollection($employees);
    }

    public function store(CreateEmployeeRequest $request): EmployeeResource
    {
        $employee = $this->employeeRepository->storeEmployee($request->all());

        return new EmployeeResource($employee);
    }

    public function show($id): EmployeeResource
    {
        return new EmployeeResource(Employee::findOrFail($id));
    }

    public function update(UpdateEmployeeRequest $request, $id): EmployeeResource
    {
        $employee = $this->employeeRepository->updateEmployee($request->all(), (int) $id);

        return new EmployeeResource($employee);
    }

    public function destroy($id): JsonResponse
    {
        /** @var Employee $employee */
        $employee = Employee::findOrFail($id);
        // linked user login is kept
        $employee->clearMediaCollection(Employee::PHOTO_PATH);
        $employee->clearMediaCollection(Employee::DOCUMENT_PATH);
        $employee->delete();

        return $this->sendSuccess('Employee deleted successfully');
    }

    public function deletePhoto($id): JsonResponse
    {
        Employee::findOrFail($id)->clearMediaCollection(Employee::PHOTO_PATH);

        return $this->sendSuccess('Photo removed successfully');
    }

    public function uploadDocument(Request $request, $id): EmployeeResource
    {
        $request->validate([
            'document' => 'required|file|mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx|max:10240',
            'title' => 'nullable|max:191',
        ], [
            'document.mimes' => 'Allowed document types: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX.',
            'document.max' => 'Documents must be 10 MB or smaller.',
        ]);
        /** @var Employee $employee */
        $employee = Employee::findOrFail($id);
        $this->employeeRepository->addDocument($employee, $request->file('document'), $request->get('title'));

        return new EmployeeResource($employee->fresh());
    }

    public function deleteDocument($id, $mediaId): JsonResponse
    {
        /** @var Employee $employee */
        $employee = Employee::findOrFail($id);
        $media = $employee->getMedia(Employee::DOCUMENT_PATH)->firstWhere('id', (int) $mediaId);
        if (! $media) {
            return $this->sendError('Document not found.', 404);
        }
        $media->delete();

        return $this->sendSuccess('Document deleted successfully');
    }

    public function unlinkUser($id): EmployeeResource
    {
        /** @var Employee $employee */
        $employee = Employee::findOrFail($id);
        $employee->update(['user_id' => null]);

        return new EmployeeResource($employee->fresh());
    }

    public function availableUsers(Request $request): JsonResponse
    {
        $employeeId = $request->get('employee_id') ? (int) $request->get('employee_id') : null;

        return $this->sendResponse($this->employeeRepository->availableUsers($employeeId), 'Users retrieved successfully');
    }

    public function nextCode(): JsonResponse
    {
        return $this->sendResponse(['employee_code' => Employee::generateCode()], 'Code retrieved successfully');
    }
}
