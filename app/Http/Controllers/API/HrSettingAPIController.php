<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Models\HrSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HrSettingAPIController extends AppBaseController
{
    public function index(): JsonResponse
    {
        return $this->sendResponse(HrSetting::getAll(), 'HR settings retrieved successfully');
    }

    public function update(Request $request): JsonResponse
    {
        $input = $request->only(array_keys(HrSetting::DEFAULTS));
        foreach (HrSetting::BOOLEAN_KEYS as $key) {
            if (array_key_exists($key, $input)) {
                $input[$key] = filter_var($input[$key], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
            }
        }
        $request->replace(array_merge($request->all(), $input));
        $validated = $request->validate(HrSetting::$rules, [
            'work_start.date_format' => 'Work start must be a time like 08:30.',
            'work_end.date_format' => 'Work end must be a time like 17:30.',
        ]);

        foreach ($validated as $key => $value) {
            if (str_contains($key, '.')) {
                continue;
            }
            $stored = $key === 'weekend_days' ? json_encode(array_values(array_map('intval', $value))) : (string) $value;
            HrSetting::updateOrCreate(['key' => $key], ['value' => $stored]);
        }

        return $this->sendResponse(HrSetting::getAll(), 'HR settings updated successfully');
    }
}
