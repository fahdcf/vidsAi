<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {Schema::table('agent_runs',fn(Blueprint $t)=>$t->json('snapshot')->nullable());}
 public function down():void {Schema::table('agent_runs',fn(Blueprint $t)=>$t->dropColumn('snapshot'));}
};
