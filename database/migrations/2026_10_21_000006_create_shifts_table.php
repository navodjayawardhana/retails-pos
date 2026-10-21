<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shifts', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->string('name')->unique();
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedInteger('break_minutes')->default(0);
            $table->unsignedInteger('late_grace_minutes')->nullable();
            $table->decimal('half_day_hours', 4, 2)->nullable();
            $table->boolean('is_night_shift')->default(false);
            // JSON array of weekday numbers (0 = Sunday); null = hr_settings.weekend_days
            $table->json('weekly_off_days')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('employee_shifts', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('shift_id')->constrained('shifts')->cascadeOnDelete();
            $table->date('from_date');
            $table->date('to_date')->nullable();
            $table->timestamps();
            $table->index(['employee_id', 'from_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_shifts');
        Schema::dropIfExists('shifts');
    }
};
