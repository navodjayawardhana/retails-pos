<?php

namespace App\Models;

use App\Models\Contracts\JsonResourceful;
use App\Traits\HasJsonResourcefulData;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property string $code
 * @property float $default_days_per_year
 * @property bool $is_unlimited
 * @property bool $is_paid
 * @property bool $allow_half_day
 * @property bool $carry_forward
 * @property float|null $max_carry_forward_days
 * @property bool $requires_document
 * @property string|null $gender
 * @property string $color
 * @property bool $is_active
 */
class LeaveType extends BaseModel implements JsonResourceful
{
    use HasFactory, HasJsonResourcefulData;

    protected $table = 'leave_types';

    const JSON_API_TYPE = 'leave_types';

    protected $fillable = [
        'name',
        'code',
        'default_days_per_year',
        'is_unlimited',
        'is_paid',
        'allow_half_day',
        'carry_forward',
        'max_carry_forward_days',
        'requires_document',
        'gender',
        'color',
        'is_active',
        'description',
    ];

    protected $casts = [
        'default_days_per_year' => 'float',
        'max_carry_forward_days' => 'float',
        'is_unlimited' => 'boolean',
        'is_paid' => 'boolean',
        'allow_half_day' => 'boolean',
        'carry_forward' => 'boolean',
        'requires_document' => 'boolean',
        'is_active' => 'boolean',
    ];

    public static function rules(?int $id = null): array
    {
        return [
            'name' => 'required|max:191|unique:leave_types,name'.($id ? ','.$id : ''),
            'code' => 'required|max:20|unique:leave_types,code'.($id ? ','.$id : ''),
            'default_days_per_year' => 'required_unless:is_unlimited,1|nullable|numeric|min:0|max:366',
            'is_unlimited' => 'nullable|boolean',
            'is_paid' => 'nullable|boolean',
            'allow_half_day' => 'nullable|boolean',
            'carry_forward' => 'nullable|boolean',
            'max_carry_forward_days' => 'nullable|numeric|min:0|max:366',
            'requires_document' => 'nullable|boolean',
            'gender' => 'nullable|in:male,female',
            'color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'is_active' => 'nullable|boolean',
            'description' => 'nullable|max:1000',
        ];
    }

    public function prepareLinks(): array
    {
        return [
            'self' => route('leave-types.show', $this->id),
        ];
    }

    public function prepareAttributes(): array
    {
        return [
            'name' => $this->name,
            'code' => $this->code,
            'default_days_per_year' => $this->default_days_per_year,
            'is_unlimited' => $this->is_unlimited,
            'is_paid' => $this->is_paid,
            'allow_half_day' => $this->allow_half_day,
            'carry_forward' => $this->carry_forward,
            'max_carry_forward_days' => $this->max_carry_forward_days,
            'requires_document' => $this->requires_document,
            'gender' => $this->gender,
            'color' => $this->color,
            'is_active' => $this->is_active,
            'description' => $this->description,
            'created_at' => $this->created_at,
        ];
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function entitlements(): HasMany
    {
        return $this->hasMany(LeaveEntitlement::class);
    }

    /**
     * Whether an employee may take this type (gender restriction).
     */
    public function appliesTo(Employee $employee): bool
    {
        return ! $this->gender || $this->gender === $employee->gender;
    }
}
