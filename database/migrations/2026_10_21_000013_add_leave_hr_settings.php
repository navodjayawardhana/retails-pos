<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! DB::table('hr_settings')->where('key', 'prorate_first_year')->exists()) {
            DB::table('hr_settings')->insert([
                'key' => 'prorate_first_year',
                'value' => '1',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('hr_settings')->where('key', 'prorate_first_year')->delete();
    }
};
