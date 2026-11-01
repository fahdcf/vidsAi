<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {Schema::create('project_assets',function(Blueprint $t){$t->uuid('id')->primary();$t->foreignId('project_id')->constrained()->cascadeOnDelete();$t->string('path');$t->string('name');$t->string('mime');$t->unsignedBigInteger('size');$t->timestamps();});}
 public function down():void {Schema::dropIfExists('project_assets');}
};
