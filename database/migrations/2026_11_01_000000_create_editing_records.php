<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {
  Schema::create('edit_revisions',function(Blueprint $t){$t->id();$t->foreignId('project_id')->constrained()->cascadeOnDelete();$t->unsignedInteger('revision');$t->json('document');$t->timestamps();$t->unique(['project_id','revision']);});
  Schema::create('edit_commands',function(Blueprint $t){$t->uuid('id')->primary();$t->foreignId('project_id')->constrained()->cascadeOnDelete();$t->string('input_hash');$t->json('result');$t->timestamps();});
  Schema::create('video_exports',function(Blueprint $t){$t->uuid('id')->primary();$t->foreignId('project_id')->constrained()->cascadeOnDelete();$t->unsignedInteger('revision');$t->json('snapshot');$t->string('status')->default('queued');$t->string('worker_job_id')->nullable();$t->text('output_url')->nullable();$t->text('error')->nullable();$t->float('progress')->default(0);$t->timestamps();});
  Schema::create('agent_runs',function(Blueprint $t){$t->uuid('id')->primary();$t->foreignId('project_id')->constrained()->cascadeOnDelete();$t->unsignedInteger('starting_revision');$t->text('message');$t->string('status');$t->json('plan')->nullable();$t->json('result')->nullable();$t->text('error')->nullable();$t->timestamps();});
 }
 public function down():void {foreach(['agent_runs','video_exports','edit_commands','edit_revisions'] as $table)Schema::dropIfExists($table);}
};
