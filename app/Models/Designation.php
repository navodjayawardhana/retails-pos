<?php

namespace App\Models;

use App\Models\Contracts\JsonResourceful;
use App\Traits\HasJsonResourcefulData;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property int|null $department_id
 * @property string|null $description
 */
class Designation extends BaseModel implements JsonResourceful
{
    use HasFactory, HasJsonResourcefulData;

    protected $table = 'designations';

    const JSON_API_TYPE = 'designations';

    protected $fillable = [
        'name',
        'department_id',
        'description',
    ];

    public static $rules = [
        'name' => 'required|max:191',
        'department_id' => 'nullable|exists:departments,id',
        'description' => 'nullable|max:1000',
    ];

    public function prepareLinks(): array
    {
        return [
            'self' => route('designations.show', $this->id),
        ];
    }

    public function prepareAttributes(): array
    {
        return [
            'name' => $this->name,
            'department_id' => $this->department_id,
            'department_name' => $this->department ? $this->department->name : null,
            'description' => $this->description,
            'employees_count' => $this->employees()->count(),
            'created_at' => $this->created_at,
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }
}
