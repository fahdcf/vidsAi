<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Scene;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Scene>
 */
class SceneFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Scene::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'scene_number' => $this->faker->numberBetween(1, 10),
            'script_text' => $this->faker->sentence(),
            'video_url' => $this->faker->url(),
            'video_path' => null,
            'thumbnail_path' => null,
            'duration_seconds' => $this->faker->randomFloat(1, 3.0, 15.0),
            'keywords' => $this->faker->words(3, true),
            'prompt' => $this->faker->sentence(),
            'status' => 'completed',
            'approved' => false,
        ];
    }

    /**
     * Indicate that the scene is pending.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
        ]);
    }

    /**
     * Indicate that the scene is processing.
     */
    public function processing(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'processing',
        ]);
    }

    /**
     * Indicate that the scene is completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
        ]);
    }

    /**
     * Indicate that the scene is approved.
     */
    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'approved' => true,
        ]);
    }

    /**
     * Set a specific scene number.
     */
    public function sceneNumber(int $number): static
    {
        return $this->state(fn (array $attributes) => [
            'scene_number' => $number,
        ]);
    }
}
