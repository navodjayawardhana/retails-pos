<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $settings = [
        // POS sales commission paid through payroll
        'commission_enabled' => '0',
        // past working days with no attendance row count as absent (no-pay)
        'payroll_unmarked_as_absent' => '1',
        // daily-wage staff are paid for paid holidays that fall on working days
        'daily_wage_paid_holidays' => '1',
        // pro-rate monthly basic for employees who join or leave mid-month
        'payroll_prorate_joiners' => '1',
    ];

    public function up(): void
    {
        if (! Schema::hasColumn('employees', 'commission_percent')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->decimal('commission_percent', 5, 2)->nullable()->after('epf_applicable');
            });
        }

        foreach ($this->settings as $key => $value) {
            if (! DB::table('hr_settings')->where('key', $key)->exists()) {
                DB::table('hr_settings')->insert(['key' => $key, 'value' => $value, 'created_at' => now(), 'updated_at' => now()]);
            }
        }
    }

    public function down(): void
    {
        DB::table('hr_settings')->whereIn('key', array_keys($this->settings))->delete();
        if (Schema::hasColumn('employees', 'commission_percent')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->dropColumn('commission_percent');
            });
        }
    }
};
