<?php

namespace App\Http\Requests;

use App\Models\Department;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = Department::$rules;
        $rules['name'] = 'required|max:191|unique:departments,name,'.$this->route('department');

        return $rules;
    }
}
