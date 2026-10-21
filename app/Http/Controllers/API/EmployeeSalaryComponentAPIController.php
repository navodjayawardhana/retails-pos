<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Models\Employee;
use App\Models\EmployeeSalaryComponent;
use App\Models\HrSetting;
use App\Services\Hrm\PayrollService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * An employee's salary structure (allowances / deductions) with effective dates.
 */
class EmployeeSalaryComponentAPIController extends AppBaseController
{
    /**
     * GET employee-salary-components?employee_id= → {current: [...], history: [...]}
     */
    public function index(Request $request, PayrollService $payroll): JsonResponse
    {
        $request->validate(['employee_id' => 'required|exists:employees,id']);
        $employee = Employee::findOrFail($request->get('employee_id'));
        $current = $payroll->structure($employee, HrSetting::today())->map(fn ($line) => $this->row($line, $employee))->values();
        $history = EmployeeSalaryComponent::with('component')->where('employee_id', $employee->id)
            ->orderBy('effective_from', 'desc')->orderBy('id', 'desc')->get()
            ->map(fn ($line) => $this->row($line, $employee))->values();

        return $this->sendResponse(['current' => $current, 'history' => $history], 'Salary structure retrieved successfully');
    }

    /**
     * POST employee-salary-components {employee_id, items:[{salary_component_id, value|null, effective_from}]}
     * Same component + effective date is updated in place.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'items' => 'required|array|min:1',
            'items.*.salary_component_id' => 'required|exists:salary_components,id',
            'items.*.value' => 'nullable|numeric|min:0',
            'items.*.effective_from' => 'required|date',
        ], [
            'items.required' => 'Add at least one component.',
            'items.*.effective_from.required' => 'Each component needs an effective date.',
        ]);

        DB::transaction(function () use ($request) {
            foreach ($request->get('items') as $item) {
                EmployeeSalaryComponent::updateOrCreate(
                    [
                        'employee_id' => $request->get('employee_id'),
                        'salary_component_id' => $item['salary_component_id'],
                        'effective_from' => $item['effective_from'],
                    ],
                    ['value' => isset($item['value']) && $item['value'] !== '' ? (float) $item['value'] : null]
                );
            }
        });

        return $this->sendSuccess('Salary structure saved successfully');
    }

    public function destroy($id): JsonResponse
    {
        EmployeeSalaryComponent::findOrFail($id)->delete();

        return $this->sendSuccess('Salary component removed from the structure');
    }

    private function row(EmployeeSalaryComponent $line, Employee $employee): array
    {
        $component = $line->component;
        $value = $line->value ?? ($component ? $component->default_value : 0);

        return [
            'id' => $line->id,
            'salary_component_id' => $line->salary_component_id,
            'name' => $component ? $component->name : null,
            'code' => $component ? $component->code : null,
            'type' => $component ? $component->type : null,
            'calculation' => $component ? $component->calculation : null,
            'epf_liable' => $component ? $component->epf_liable : false,
            'is_active' => $component ? $component->is_active : false,
            'value' => $line->value,
            'effective_value' => $value,
            'amount' => $component ? $component->amountFor((float) $employee->basic_salary, $line->value) : 0,
            'effective_from' => $line->effective_from->format('Y-m-d'),
        ];
    }
}
