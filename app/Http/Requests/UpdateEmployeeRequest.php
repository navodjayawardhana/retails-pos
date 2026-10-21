<?php

namespace App\Http\Requests;

use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('id') ?? $this->route('employee');
        $rules = Employee::$rules;
        $rules['nic'] = 'nullable|max:20|unique:employees,nic,'.$id;
        $rules['user_id'] = 'nullable|exists:users,id|unique:employees,user_id,'.$id;

        return $rules;
    }
}
