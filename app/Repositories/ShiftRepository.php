<?php

namespace App\Repositories;

use App\Models\Shift;

class ShiftRepository extends BaseRepository
{
    protected $fieldSearchable = [
        'name',
        'created_at',
    ];

    public function getFieldsSearchable(): array
    {
        return $this->fieldSearchable;
    }

    public function model()
    {
        return Shift::class;
    }
}
