<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Key/value HR settings (same style as the app's Setting model).
 *
 * @property int $id
 * @property string $key
 * @property string|null $value
 */
class HrSetting extends Model
{
    protected $table = 'hr_settings';

    protected $fillable = [
        'key',
        'value',
    ];

    // Values are stored as strings; JSON arrays (weekend_days) as JSON text.
    public const DEFAULTS = [
        'work_start' => '08:30',
        'work_end' => '17:30',
        'late_grace_minutes' => '15',
        'half_day_hours' => '4',
        'working_days_per_month' => '26',
        'working_hours_per_day' => '8',
        'ot_multiplier' => '1.5',
        'late_deduction_enabled' => '0',
        'epf_employee_rate' => '8',
        'epf_employer_rate' => '12',
        'etf_rate' => '3',
        'weekend_days' => '[0]',
        'saturday_half_day' => '1',
        'auto_clock_in_on_pos_login' => '1',
        'attendance_pos_auto' => '1',
        'attendance_manual' => '1',
        'attendance_device_import' => '1',
        'auto_clock_out_on_logout' => '0',
        // HR clock/calendar timezone (the app itself runs in UTC)
        'timezone' => 'Asia/Colombo',
        // pro-rate leave entitlements for employees who joined during the year
        'prorate_first_year' => '1',
        // payroll (phase 4)
        'commission_enabled' => '0',
        'payroll_unmarked_as_absent' => '1',
        'daily_wage_paid_holidays' => '1',
        'payroll_prorate_joiners' => '1',
    ];

    public const BOOLEAN_KEYS = [
        'late_deduction_enabled',
        'saturday_half_day',
        'auto_clock_in_on_pos_login',
        'attendance_pos_auto',
        'attendance_manual',
        'attendance_device_import',
        'auto_clock_out_on_logout',
        'prorate_first_year',
        'commission_enabled',
        'payroll_unmarked_as_absent',
        'daily_wage_paid_holidays',
        'payroll_prorate_joiners',
    ];

    public const NUMERIC_KEYS = [
        'late_grace_minutes',
        'half_day_hours',
        'working_days_per_month',
        'working_hours_per_day',
        'ot_multiplier',
        'epf_employee_rate',
        'epf_employer_rate',
        'etf_rate',
    ];

    public static $rules = [
        'work_start' => 'sometimes|date_format:H:i',
        'work_end' => 'sometimes|date_format:H:i',
        'late_grace_minutes' => 'sometimes|integer|min:0|max:240',
        'half_day_hours' => 'sometimes|numeric|min:0|max:24',
        'working_days_per_month' => 'sometimes|integer|min:1|max:31',
        'working_hours_per_day' => 'sometimes|numeric|min:1|max:24',
        'ot_multiplier' => 'sometimes|numeric|min:0|max:10',
        'late_deduction_enabled' => 'sometimes|boolean',
        'epf_employee_rate' => 'sometimes|numeric|min:0|max:100',
        'epf_employer_rate' => 'sometimes|numeric|min:0|max:100',
        'etf_rate' => 'sometimes|numeric|min:0|max:100',
        'weekend_days' => 'sometimes|array',
        'weekend_days.*' => 'integer|min:0|max:6',
        'saturday_half_day' => 'sometimes|boolean',
        'auto_clock_in_on_pos_login' => 'sometimes|boolean',
        'attendance_pos_auto' => 'sometimes|boolean',
        'attendance_manual' => 'sometimes|boolean',
        'attendance_device_import' => 'sometimes|boolean',
        'auto_clock_out_on_logout' => 'sometimes|boolean',
        'timezone' => 'sometimes|timezone',
        'prorate_first_year' => 'sometimes|boolean',
        'commission_enabled' => 'sometimes|boolean',
        'payroll_unmarked_as_absent' => 'sometimes|boolean',
        'daily_wage_paid_holidays' => 'sometimes|boolean',
        'payroll_prorate_joiners' => 'sometimes|boolean',
    ];

    /**
     * All settings as typed values (defaults filled in for missing keys).
     */
    public static function getAll(): array
    {
        $stored = static::pluck('value', 'key')->toArray();
        $settings = [];
        foreach (static::DEFAULTS as $key => $default) {
            $settings[$key] = static::castValue($key, $stored[$key] ?? $default);
        }

        return $settings;
    }

    /**
     * Current wall-clock time in the HR timezone. Attendance stores local wall-clock times,
     * so always use this (not now()) for clock-in/out and "today".
     */
    public static function now(): \Carbon\Carbon
    {
        $timezone = static::get('timezone') ?: config('app.timezone');

        try {
            $local = \Carbon\Carbon::now($timezone);
        } catch (\Throwable $e) {
            $local = \Carbon\Carbon::now();
        }

        // re-wrap as app-timezone Carbon with the same wall-clock values
        return \Carbon\Carbon::parse($local->format('Y-m-d H:i:s'));
    }

    public static function today(): string
    {
        return static::now()->toDateString();
    }

    public static function get(string $key)
    {
        return static::getAll()[$key] ?? null;
    }

    public static function castValue(string $key, $value)
    {
        if (in_array($key, static::BOOLEAN_KEYS, true)) {
            return (bool) (int) $value;
        }
        if (in_array($key, static::NUMERIC_KEYS, true)) {
            return $value + 0;
        }
        if ($key === 'weekend_days') {
            $decoded = is_array($value) ? $value : json_decode($value, true);

            return array_values(array_map('intval', $decoded ?: []));
        }

        return $value;
    }
}
