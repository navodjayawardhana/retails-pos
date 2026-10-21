<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An employee's salary structure line. The latest effective_from (<= the payroll month end) wins per component.
 *
 * @property int $id
 * @property int $employee_id
 * @property int $salary_component_id
 * @property float|null $value null = the component default
 * @property \Carbon\Carbon $effective_from
 */
class EmployeeSalaryComponent extends Model
{
    protected $table = 'employee_salary_components';

    protected $fillable = [
        'employee_id',
        'salary_component_id',
        'value',
        'effective_from',
    ];

    protected $casts = [
        'value' => 'float',
        'effective_from' => 'date:Y-m-d',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(SalaryComponent::class, 'salary_component_id');
    }
}
