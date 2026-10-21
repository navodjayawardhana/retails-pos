<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_logs', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->string('to', 40)->nullable();
            $table->text('message')->nullable();
            $table->string('provider', 20);
            $table->string('status', 10);
            $table->unsignedInteger('pages')->nullable();
            $table->string('campaign_id', 64)->nullable();
            $table->text('error')->nullable();
            $table->json('response')->nullable();
            $table->string('context_type', 40)->nullable();
            $table->unsignedBigInteger('context_id')->nullable();
            $table->unsignedBigInteger('sent_by')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('created_at');
            $table->index(['context_type', 'context_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_logs');
    }
};
