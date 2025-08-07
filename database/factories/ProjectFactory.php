<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Project>
 */
class ProjectFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Project::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => $this->faker->sentence(3),
            'type' => $this->faker->randomElement(['product', 'service']),
            'category' => $this->faker->word(),
            'description' => $this->faker->paragraph(),
            'language' => 'english',
            'video_format' => ['16:9'],
            'script_option' => $this->faker->randomElement(['paste', 'generate']),
            'custom_script' => $this->faker->paragraph(),
            'voiceover_option' => $this->faker->randomElement(['upload', 'ai', 'none']),
            'voiceover_file' => null,
            'status' => 'pending',
            'job_id' => null,
            'final_video_path' => null,
            'scenes_data' => null,
        ];
    }

    /**
     * Indicate that the project is in processing status.
     */
    public function processing(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'processing',
        ]);
    }

    /**
     * Indicate that the project is in reviewing status.
     */
    public function reviewing(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'reviewing',
        ]);
    }

    /**
     * Indicate that the project is completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
        ]);
    }

    /**
     * Indicate that the project has uploaded voiceover.
     */
    public function withUploadedVoiceover(): static
    {
        return $this->state(fn (array $attributes) => [
            'voiceover_option' => 'upload',
            'voiceover_file' => 'voiceovers/test-voice.wav',
        ]);
    }
}
