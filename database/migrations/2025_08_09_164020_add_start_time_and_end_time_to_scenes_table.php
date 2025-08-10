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
        Schema::table('scenes', function (Blueprint $table) {
            $table->decimal('start_time', 8, 2)->nullable()->after('trimmed_duration')->comment('Start time for trimming');
            $table->decimal('end_time', 8, 2)->nullable()->after('start_time')->comment('End time for trimming');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('scenes', function (Blueprint $table) {
            $table->dropColumn(['start_time', 'end_time']);
        });
    }
};
