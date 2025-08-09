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
        // For MySQL, we need to modify the enum column to include the new value
        DB::statement("ALTER TABLE projects MODIFY COLUMN status ENUM('pending', 'processing', 'reviewing', 'subtitle_selection', 'subtitle_generating', 'completed', 'failed') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove the subtitle_generating status and revert to previous enum
        DB::statement("ALTER TABLE projects MODIFY COLUMN status ENUM('pending', 'processing', 'reviewing', 'subtitle_selection', 'completed', 'failed') DEFAULT 'pending'");
    }
};
