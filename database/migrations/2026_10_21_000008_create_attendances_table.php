<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->date('date');
            $table->dateTime('clock_in')->nullable();
            $table->dateTime('clock_out')->nullable();
            // present | late | half_day | absent | leave | holiday | weekend
            $table->string('status', 20)->default('present');
            $table->unsignedInteger('late_minutes')->default(0);
            $table->unsignedInteger('early_leave_minutes')->default(0);
            $table->unsignedInteger('worked_minutes')->default(0);
            $table->unsignedInteger('ot_minutes')->default(0);
            // pos_auto | manual | device_import | self
            $table->string('source', 20)->default('manual');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['employee_id', 'date']);
            $table->index(['date', 'status']);
        });

        if (! DB::table('hr_settings')->where('key', 'auto_clock_out_on_logout')->exists()) {
            DB::table('hr_settings')->insert([
                'key' => 'auto_clock_out_on_logout',
                'value' => '0',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
        DB::table('hr_settings')->where('key', 'auto_clock_out_on_logout')->delete();
    }
};
