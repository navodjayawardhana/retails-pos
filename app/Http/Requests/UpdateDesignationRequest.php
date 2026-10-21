<?php

namespace App\Http\Requests;

use App\Models\Designation;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDesignationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = Designation::$rules;
        $rules['name'] = ['required', 'max:191', \Illuminate\Validation\Rule::unique('designations')->where('department_id', $this->input('department_id'))->ignore($this->route('designation'))];

        return $rules;
    }
}
