<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_types', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->string('name')->unique();
            $table->string('code', 20)->unique();
            $table->decimal('default_days_per_year', 6, 1)->default(0);
            // no yearly cap (e.g. no-pay leave); entitlement/balance checks are skipped
            $table->boolean('is_unlimited')->default(false);
            $table->boolean('is_paid')->default(true);
            $table->boolean('allow_half_day')->default(true);
            $table->boolean('carry_forward')->default(false);
            $table->decimal('max_carry_forward_days', 6, 1)->nullable();
            $table->boolean('requires_document')->default(false);
            // null = everyone; male | female
            $table->string('gender', 10)->nullable();
            $table->string('color', 9)->default('#1E3A8A');
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        $now = now();
        DB::table('leave_types')->insert([
            ['name' => 'Annual Leave', 'code' => 'AL', 'default_days_per_year' => 14, 'is_unlimited' => false, 'is_paid' => true,
                'allow_half_day' => true, 'carry_forward' => true, 'max_carry_forward_days' => 7, 'requires_document' => false,
                'gender' => null, 'color' => '#1E3A8A', 'is_active' => true, 'description' => null, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Casual Leave', 'code' => 'CL', 'default_days_per_year' => 7, 'is_unlimited' => false, 'is_paid' => true,
                'allow_half_day' => true, 'carry_forward' => false, 'max_carry_forward_days' => null, 'requires_document' => false,
                'gender' => null, 'color' => '#0AC074', 'is_active' => true, 'description' => null, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Medical Leave', 'code' => 'ML', 'default_days_per_year' => 7, 'is_unlimited' => false, 'is_paid' => true,
                'allow_half_day' => true, 'carry_forward' => false, 'max_carry_forward_days' => null, 'requires_document' => true,
                'gender' => null, 'color' => '#F62947', 'is_active' => true, 'description' => null, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'No Pay Leave', 'code' => 'NP', 'default_days_per_year' => 0, 'is_unlimited' => true, 'is_paid' => false,
                'allow_half_day' => true, 'carry_forward' => false, 'max_carry_forward_days' => null, 'requires_document' => false,
                'gender' => null, 'color' => '#6C757D', 'is_active' => true, 'description' => null, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_types');
    }
};
