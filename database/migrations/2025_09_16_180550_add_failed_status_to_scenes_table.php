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
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        Schema::table('scenes', function (Blueprint $table) {
            $table->enum('status', ['pending', 'processing', 'completed', 'regenerating', 'failed'])->default('pending')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        Schema::table('scenes', function (Blueprint $table) {
            $table->enum('status', ['pending', 'processing', 'completed', 'regenerating'])->default('pending')->change();
        });
    }
};
