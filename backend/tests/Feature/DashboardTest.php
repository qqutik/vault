<?php

declare(strict_types=1);

use App\Models\Folder;
use App\Models\User;
use App\Models\VaultItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

it('rejects unauthenticated dashboard access', function () {
    $this->getJson('/api/dashboard')->assertUnauthorized();
});

it('returns the current user and their stats', function () {
    $user = User::factory()->create();

    Folder::factory()->count(2)->for($user)->create();
    VaultItem::factory()->count(3)->for($user)->create();
    VaultItem::factory()->for($user)->create(['favorite' => true]);

    Sanctum::actingAs($user);

    $this->getJson('/api/dashboard')
        ->assertOk()
        ->assertJson([
            'user' => ['id' => $user->id, 'email' => $user->email],
            'stats' => [
                'folders' => 2,
                'vault_items' => 4,
                'favorites' => 1,
                'passkeys' => 0,
            ],
        ]);
});

it('returns the authenticated user from /me', function () {
    $user = User::factory()->create();

    Sanctum::actingAs($user);

    $this->getJson('/api/me')
        ->assertOk()
        ->assertJson(['id' => $user->id, 'email' => $user->email]);
});

it('revokes the access token on logout', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test')->plainTextToken;

    $this->withToken($token)->postJson('/api/auth/logout')->assertOk();

    expect($user->tokens()->count())->toBe(0);
});
