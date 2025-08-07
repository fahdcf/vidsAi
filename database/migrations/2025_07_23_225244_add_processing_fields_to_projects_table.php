<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->timestamp('processing_started_at')->nullable()->after('updated_at');
            $table->timestamp('processing_completed_at')->nullable()->after('processing_started_at');
            $table->text('error_message')->nullable()->after('processing_completed_at');
            $table->json('trim_response')->nullable()->after('error_message');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['processing_started_at', 'processing_completed_at', 'error_message', 'trim_response']);
        });
    }
};
