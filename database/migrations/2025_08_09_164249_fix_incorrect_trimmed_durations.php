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
        // Fix scenes where trimmed_duration exceeds actual video duration
        DB::table('scenes')
            ->whereRaw('trimmed_duration > duration_seconds')
            ->update([
                'trimmed_duration' => DB::raw('duration_seconds'),
                'start_time' => 0,
                'end_time' => DB::raw('duration_seconds')
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to reverse this as it's just fixing data
    }
};
