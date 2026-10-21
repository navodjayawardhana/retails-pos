<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salary_components', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->string('name')->unique();
            $table->string('code', 20)->unique();
            // earning | deduction
            $table->string('type', 20);
            // fixed | percent_of_basic
            $table->string('calculation', 20)->default('fixed');
            // amount (fixed) or percent (percent_of_basic)
            $table->decimal('default_value', 12, 2)->default(0);
            // earnings only: counted in the EPF/ETF base
            $table->boolean('epf_liable')->default(false);
            // placeholder for a later tax (APIT) phase
            $table->boolean('taxable')->default(false);
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        $now = now();
        DB::table('salary_components')->insert([
            ['name' => 'Fixed Allowance', 'code' => 'FXA', 'type' => 'earning', 'calculation' => 'fixed',
                'default_value' => 0, 'epf_liable' => true, 'taxable' => true, 'is_active' => true,
                'description' => null, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Transport Allowance', 'code' => 'TRA', 'type' => 'earning', 'calculation' => 'fixed',
                'default_value' => 0, 'epf_liable' => false, 'taxable' => true, 'is_active' => true,
                'description' => null, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Meal Allowance', 'code' => 'MEA', 'type' => 'earning', 'calculation' => 'fixed',
                'default_value' => 0, 'epf_liable' => false, 'taxable' => true, 'is_active' => true,
                'description' => null, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Welfare Deduction', 'code' => 'WEL', 'type' => 'deduction', 'calculation' => 'fixed',
                'default_value' => 0, 'epf_liable' => false, 'taxable' => false, 'is_active' => true,
                'description' => null, 'created_at' => $now, 'updated_at' => $now],
        ]);

        Schema::create('employee_salary_components', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('salary_component_id')->constrained('salary_components')->cascadeOnDelete();
            // null = use the component's default_value
            $table->decimal('value', 12, 2)->nullable();
            $table->date('effective_from');
            $table->timestamps();
            $table->unique(['employee_id', 'salary_component_id', 'effective_from'], 'emp_salary_component_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_salary_components');
        Schema::dropIfExists('salary_components');
    }
};
