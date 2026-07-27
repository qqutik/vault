<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\VaultItemType;
use App\Models\User;
use App\Models\VaultItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VaultItem>
 */
class VaultItemFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'folder_id' => null,
            'type' => VaultItemType::Login,
            'title' => fake()->words(2, true),
            'data' => [
                'username' => fake()->userName(),
                'password' => fake()->password(),
                'url' => fake()->url(),
            ],
            'favorite' => false,
        ];
    }
}
