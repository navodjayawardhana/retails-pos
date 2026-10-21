<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_requests', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('leave_type_id')->constrained('leave_types')->restrictOnDelete();
            $table->date('from_date');
            $table->date('to_date');
            $table->boolean('is_half_day')->default(false);
            // first | second (only for half days)
            $table->string('half_session', 10)->nullable();
            // working days taken (weekends/holidays excluded, Saturday half day = 0.5)
            $table->decimal('days', 6, 1);
            $table->text('reason')->nullable();
            // pending | approved | rejected | cancelled
            $table->string('status', 20)->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('remarks')->nullable();
            // attendance dates this leave marked as `leave` (reverted on cancel/reject)
            $table->json('marked_dates')->nullable();
            // working dates left untouched because the employee had already clocked in
            $table->json('conflict_dates')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['employee_id', 'status']);
            $table->index(['from_date', 'to_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_requests');
    }
};
