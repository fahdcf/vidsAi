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
            // Modify the status enum to include 'failed'
            $table->enum('status', ['pending', 'processing', 'completed', 'regenerating', 'failed'])->default('pending')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('scenes', function (Blueprint $table) {
            // Remove 'failed' from the enum
            $table->enum('status', ['pending', 'processing', 'completed', 'regenerating'])->default('pending')->change();
        });
    }
};
