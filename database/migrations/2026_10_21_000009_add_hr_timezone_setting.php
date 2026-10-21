<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! DB::table('hr_settings')->where('key', 'timezone')->exists()) {
            DB::table('hr_settings')->insert([
                'key' => 'timezone',
                'value' => 'Asia/Colombo',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('hr_settings')->where('key', 'timezone')->delete();
    }
};
