<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_runs', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            // Y-m-01
            $table->date('month');
            $table->unsignedBigInteger('warehouse_id')->nullable();
            $table->unsignedBigInteger('department_id')->nullable();
            // draft | approved | paid
            $table->string('status', 20)->default('draft');
            $table->unsignedInteger('employee_count')->default(0);
            $table->decimal('gross_total', 14, 2)->default(0);
            $table->decimal('deduction_total', 14, 2)->default(0);
            $table->decimal('net_total', 14, 2)->default(0);
            $table->decimal('epf_employee_total', 14, 2)->default(0);
            $table->decimal('epf_employer_total', 14, 2)->default(0);
            $table->decimal('etf_total', 14, 2)->default(0);
            $table->text('notes')->nullable();
            $table->json('skipped')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->unsignedBigInteger('paid_by')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->unsignedBigInteger('expense_id')->nullable();
            $table->timestamps();
        });

        Schema::create('payslips', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('payroll_run_id')->constrained('payroll_runs')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->date('month');
            // snapshot of the employee at calculation time
            $table->string('employee_code', 30);
            $table->string('employee_name');
            $table->string('designation_name')->nullable();
            $table->string('department_name')->nullable();
            $table->string('branch_name')->nullable();
            $table->string('salary_type', 20);
            $table->decimal('basic_salary', 12, 2);
            $table->string('nic', 20)->nullable();
            $table->string('epf_no', 50)->nullable();
            $table->string('bank_name')->nullable();
            $table->string('bank_branch')->nullable();
            $table->string('bank_account_no', 50)->nullable();
            // day / time basis
            $table->decimal('working_days', 6, 1)->default(0);
            $table->decimal('payable_days', 6, 1)->default(0);
            $table->decimal('absent_days', 6, 1)->default(0);
            $table->decimal('unpaid_leave_days', 6, 1)->default(0);
            $table->decimal('paid_leave_days', 6, 1)->default(0);
            $table->decimal('ot_hours', 8, 2)->default(0);
            $table->unsignedInteger('late_minutes')->default(0);
            // money
            $table->decimal('gross_earnings', 12, 2)->default(0);
            $table->decimal('total_deductions', 12, 2)->default(0);
            $table->decimal('net_pay', 12, 2)->default(0);
            $table->decimal('epf_base', 12, 2)->default(0);
            $table->decimal('epf_employee', 12, 2)->default(0);
            $table->decimal('epf_employer', 12, 2)->default(0);
            $table->decimal('etf', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['payroll_run_id', 'employee_id']);
            $table->index(['employee_id', 'month']);
        });

        Schema::create('payslip_items', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('payslip_id')->constrained('payslips')->cascadeOnDelete();
            // earning | deduction | employer
            $table->string('type', 20);
            // basic, no_pay, ot, late, component, loan, commission, epf_employee, epf_employer, etf, adjustment
            $table->string('code', 30);
            $table->string('label');
            $table->decimal('quantity', 12, 2)->nullable();
            $table->decimal('rate', 14, 4)->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('basis')->nullable();
            $table->boolean('epf_liable')->default(false);
            $table->boolean('is_manual')->default(false);
            $table->unsignedBigInteger('salary_component_id')->nullable();
            $table->unsignedBigInteger('employee_loan_id')->nullable();
            $table->unsignedInteger('sort')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payslip_items');
        Schema::dropIfExists('payslips');
        Schema::dropIfExists('payroll_runs');
    }
};
