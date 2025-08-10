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
        // Update existing scenes to set trimmed_duration to gemini_duration as fallback
        DB::table('scenes')
            ->whereNull('trimmed_duration')
            ->update(['trimmed_duration' => DB::raw('gemini_duration')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to reverse this as it's just setting fallback values
    }
};
