<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_loans', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            // advance | loan
            $table->string('type', 20);
            $table->decimal('amount', 12, 2);
            $table->unsignedInteger('installments')->default(1);
            $table->decimal('monthly_installment', 12, 2);
            $table->date('issued_date');
            // first payroll month that deducts it (Y-m-01)
            $table->date('start_month');
            $table->decimal('balance', 12, 2);
            // active | completed | cancelled
            $table->string('status', 20)->default('active');
            $table->text('reason')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('loan_repayments', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('employee_loan_id')->constrained('employee_loans')->cascadeOnDelete();
            $table->unsignedBigInteger('payroll_run_id')->nullable();
            $table->unsignedBigInteger('payslip_id')->nullable();
            $table->decimal('amount', 12, 2);
            $table->date('date');
            // payroll | manual
            $table->string('type', 20)->default('payroll');
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_repayments');
        Schema::dropIfExists('employee_loans');
    }
};
