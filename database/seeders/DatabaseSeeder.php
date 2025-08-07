<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Project;
use App\Models\Scene;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create test user
        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        // Create sample projects
        $project1 = Project::create([
            'user_id' => $user->id,
            'name' => 'Revolutionary Tech Product Launch',
            'type' => 'product',
            'category' => 'tech',
            'description' => 'Introducing the next generation of smart home technology that will transform how you live.',
            'language' => 'english',
            'script_option' => 'generate',
            'voiceover_option' => 'ai',
            'status' => 'completed'
        ]);

        $project2 = Project::create([
            'user_id' => $user->id,
            'name' => 'Premium Beauty Service',
            'type' => 'service',
            'category' => 'beauty',
            'description' => 'Professional beauty treatments that enhance your natural glow.',
            'language' => 'english',
            'script_option' => 'paste',
            'custom_script' => 'Experience luxury beauty treatments like never before.',
            'voiceover_option' => 'ai',
            'status' => 'reviewing'
        ]);

        $project3 = Project::create([
            'user_id' => $user->id,
            'name' => 'Artisan Coffee Brand',
            'type' => 'product',
            'category' => 'food',
            'description' => 'Hand-roasted coffee beans from sustainable farms around the world.',
            'language' => 'english',
            'script_option' => 'generate',
            'voiceover_option' => 'none',
            'status' => 'processing'
        ]);

        // Create sample scenes for the completed project
        Scene::create([
            'project_id' => $project1->id,
            'scene_number' => 1,
            'script_text' => 'Welcome to the future of smart home technology.',
            'status' => 'completed',
            'approved' => true
        ]);

        Scene::create([
            'project_id' => $project1->id,
            'scene_number' => 2,
            'script_text' => 'Control everything with just your voice.',
            'status' => 'completed',
            'approved' => true
        ]);

        Scene::create([
            'project_id' => $project1->id,
            'scene_number' => 3,
            'script_text' => 'Available now - transform your home today.',
            'status' => 'completed',
            'approved' => true
        ]);

        // Create sample scenes for the reviewing project
        Scene::create([
            'project_id' => $project2->id,
            'scene_number' => 1,
            'script_text' => 'Experience luxury beauty treatments like never before.',
            'status' => 'completed',
            'approved' => false
        ]);

        Scene::create([
            'project_id' => $project2->id,
            'scene_number' => 2,
            'script_text' => 'Our expert team is ready to serve you.',
            'status' => 'completed',
            'approved' => false
        ]);
    }
}