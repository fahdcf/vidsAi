<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update existing scenes to set gemini_duration to duration_seconds as fallback
        DB::table('scenes')
            ->whereNull('gemini_duration')
            ->update(['gemini_duration' => DB::raw('duration_seconds')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to reverse this as it's just setting fallback values
    }
};
