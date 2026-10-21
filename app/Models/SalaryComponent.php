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
 * @property string $type earning|deduction
 * @property string $calculation fixed|percent_of_basic
 * @property float $default_value
 * @property bool $epf_liable
 * @property bool $taxable
 * @property bool $is_active
 */
class SalaryComponent extends BaseModel implements JsonResourceful
{
    use HasFactory, HasJsonResourcefulData;

    protected $table = 'salary_components';

    const JSON_API_TYPE = 'salary_components';

    const TYPE_EARNING = 'earning';

    const TYPE_DEDUCTION = 'deduction';

    const CALC_FIXED = 'fixed';

    const CALC_PERCENT = 'percent_of_basic';

    protected $fillable = [
        'name',
        'code',
        'type',
        'calculation',
        'default_value',
        'epf_liable',
        'taxable',
        'is_active',
        'description',
    ];

    protected $casts = [
        'default_value' => 'float',
        'epf_liable' => 'boolean',
        'taxable' => 'boolean',
        'is_active' => 'boolean',
    ];

    public static function rules(?int $id = null): array
    {
        return [
            'name' => 'required|max:191|unique:salary_components,name'.($id ? ','.$id : ''),
            'code' => 'required|max:20|unique:salary_components,code'.($id ? ','.$id : ''),
            'type' => 'required|in:earning,deduction',
            'calculation' => 'required|in:fixed,percent_of_basic',
            'default_value' => 'required|numeric|min:0',
            'epf_liable' => 'nullable|boolean',
            'taxable' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'description' => 'nullable|max:1000',
        ];
    }

    public function prepareLinks(): array
    {
        return [
            'self' => route('salary-components.show', $this->id),
        ];
    }

    public function prepareAttributes(): array
    {
        return [
            'name' => $this->name,
            'code' => $this->code,
            'type' => $this->type,
            'calculation' => $this->calculation,
            'default_value' => $this->default_value,
            'epf_liable' => $this->epf_liable,
            'taxable' => $this->taxable,
            'is_active' => $this->is_active,
            'description' => $this->description,
            'created_at' => $this->created_at,
        ];
    }

    public function employeeComponents(): HasMany
    {
        return $this->hasMany(EmployeeSalaryComponent::class);
    }

    /**
     * Amount for a given basic: fixed value, or percent of basic.
     */
    public function amountFor(float $basic, ?float $value): float
    {
        $value = $value ?? $this->default_value;

        return $this->calculation === self::CALC_PERCENT ? round($basic * $value / 100, 2) : round($value, 2);
    }
}
