<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->enum('type', ['product', 'service']);
            $table->string('category');
            $table->text('description');
            $table->string('language')->default('english');
            $table->enum('script_option', ['paste', 'generate']);
            $table->text('custom_script')->nullable();
            $table->enum('voiceover_option', ['upload', 'ai', 'none']);
            $table->string('voiceover_file')->nullable();
            $table->enum('status', ['pending', 'processing', 'reviewing', 'subtitle_selection', 'subtitle_generating', 'completed', 'failed'])->default('pending');
            $table->string('job_id')->nullable();
            $table->string('final_video_path')->nullable();
            $table->json('scenes_data')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};