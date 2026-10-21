<?php

namespace App\Repositories;

use App\Models\Designation;

class DesignationRepository extends BaseRepository
{
    protected $fieldSearchable = [
        'name',
        'description',
        'department_id',
        'created_at',
    ];

    public function getFieldsSearchable(): array
    {
        return $this->fieldSearchable;
    }

    public function model()
    {
        return Designation::class;
    }
}
