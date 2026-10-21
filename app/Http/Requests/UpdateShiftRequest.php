<?php

namespace App\Http\Requests;

use App\Models\Shift;
use Illuminate\Foundation\Http\FormRequest;

class UpdateShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = Shift::$rules;
        $rules['name'] = 'required|max:191|unique:shifts,name,'.$this->route('shift');

        return $rules;
    }
}
