<?php

namespace App\Models;

use App\Models\Contracts\JsonResourceful;
use App\Traits\HasJsonResourcefulData;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property string|null $description
 */
class Department extends BaseModel implements JsonResourceful
{
    use HasFactory, HasJsonResourcefulData;

    protected $table = 'departments';

    const JSON_API_TYPE = 'departments';

    protected $fillable = [
        'name',
        'description',
    ];

    public static $rules = [
        'name' => 'required|max:191|unique:departments',
        'description' => 'nullable|max:1000',
    ];

    public function prepareLinks(): array
    {
        return [
            'self' => route('departments.show', $this->id),
        ];
    }

    public function prepareAttributes(): array
    {
        return [
            'name' => $this->name,
            'description' => $this->description,
            'designations_count' => $this->designations()->count(),
            'employees_count' => $this->employees()->count(),
            'created_at' => $this->created_at,
        ];
    }

    public function designations(): HasMany
    {
        return $this->hasMany(Designation::class);
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }
}
