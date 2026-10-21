<?php

namespace App\Http\Requests;

use App\Models\Designation;
use Illuminate\Foundation\Http\FormRequest;

class CreateDesignationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = Designation::$rules;
        $rules['name'] = ['required', 'max:191', \Illuminate\Validation\Rule::unique('designations')->where('department_id', $this->input('department_id'))];

        return $rules;
    }
}
