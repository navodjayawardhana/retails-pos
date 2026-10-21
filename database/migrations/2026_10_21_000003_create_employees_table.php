<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->string('employee_code')->unique();
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('nic')->nullable()->unique();
            $table->date('dob')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('city')->nullable();

            // branch = existing warehouse
            $table->unsignedBigInteger('warehouse_id')->nullable();
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('designation_id')->nullable()->constrained('designations')->nullOnDelete();
            // one user <-> at most one employee
            $table->unsignedBigInteger('user_id')->nullable()->unique();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();

            $table->date('joining_date')->nullable();
            $table->enum('employment_type', ['permanent', 'contract', 'probation', 'daily'])->default('permanent');
            $table->enum('salary_type', ['monthly', 'daily'])->default('monthly');
            $table->decimal('basic_salary', 12, 2)->default(0);

            // per-employee overrides (null = fall back to shift, then hr_settings)
            $table->boolean('ot_eligible')->default(true);
            $table->decimal('ot_rate_multiplier', 5, 2)->nullable();
            $table->boolean('late_deduction_enabled')->nullable();
            $table->time('work_start')->nullable();
            $table->time('work_end')->nullable();
            $table->boolean('epf_applicable')->default(true);

            $table->string('bank_name')->nullable();
            $table->string('bank_branch')->nullable();
            $table->string('bank_account_no')->nullable();
            $table->string('epf_no')->nullable();
            $table->string('etf_no')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();
            $table->enum('status', ['active', 'resigned', 'terminated'])->default('active');
            $table->date('leaving_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
