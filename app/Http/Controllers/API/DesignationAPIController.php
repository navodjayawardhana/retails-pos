<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Http\Requests\CreateDesignationRequest;
use App\Http\Requests\UpdateDesignationRequest;
use App\Http\Resources\DesignationCollection;
use App\Http\Resources\DesignationResource;
use App\Models\Designation;
use App\Repositories\DesignationRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DesignationAPIController extends AppBaseController
{
    private DesignationRepository $designationRepository;

    public function __construct(DesignationRepository $designationRepository)
    {
        $this->designationRepository = $designationRepository;
    }

    public function index(Request $request): DesignationCollection
    {
        $perPage = getPageSize($request);
        $designations = $this->designationRepository;
        if ($request->get('department_id')) {
            $designations->where('department_id', $request->get('department_id'));
        }
        $designations = $designations->paginate($perPage);
        DesignationResource::usingWithCollection();

        return new DesignationCollection($designations);
    }

    public function store(CreateDesignationRequest $request): DesignationResource
    {
        $designation = $this->designationRepository->create($request->only(['name', 'department_id', 'description']));

        return new DesignationResource($designation);
    }

    public function show($id): DesignationResource
    {
        return new DesignationResource($this->designationRepository->find($id));
    }

    public function update(UpdateDesignationRequest $request, $id): DesignationResource
    {
        $designation = $this->designationRepository->update($request->only(['name', 'department_id', 'description']), $id);

        return new DesignationResource($designation);
    }

    public function destroy($id): JsonResponse
    {
        /** @var Designation $designation */
        $designation = Designation::findOrFail($id);
        if ($designation->employees()->exists()) {
            return $this->sendError('Designation can\'t be deleted because it has employees.');
        }
        $designation->delete();

        return $this->sendSuccess('Designation deleted successfully');
    }
}
