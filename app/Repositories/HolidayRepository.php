<?php

namespace App\Repositories;

use App\Models\Holiday;

class HolidayRepository extends BaseRepository
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
        return Holiday::class;
    }
}
