<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_entitlements', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('leave_type_id')->constrained('leave_types')->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            // allowed days for the year (default or pro-rated, or a manual override)
            $table->decimal('days', 6, 1)->default(0);
            // unused days brought forward from the previous year
            $table->decimal('carried_forward', 6, 1)->default(0);
            // true when set by hand; "initialise year" won't overwrite it unless asked
            $table->boolean('is_custom')->default(false);
            $table->string('notes')->nullable();
            $table->timestamps();
            $table->unique(['employee_id', 'leave_type_id', 'year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_entitlements');
    }
};
