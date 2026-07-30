<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\VaultItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

it('rejects unauthenticated access to health data', function () {
    $this->getJson('/api/vault-items/health')->assertUnauthorized();
});

it('returns only the user non-protected login items with data', function () {
    $user = User::factory()->create();

    VaultItem::factory()->for($user)->create(['type' => 'login', 'title' => 'GitHub']);
    VaultItem::factory()->for($user)->create(['type' => 'login', 'require_reauth' => true]); // step-up
    VaultItem::factory()->for($user)->create(['type' => 'card', 'title' => 'Bank card']);   // not a login
    VaultItem::factory()->create(['type' => 'login']); // another user's item

    Sanctum::actingAs($user);

    $this->getJson('/api/vault-items/health')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.title', 'GitHub')
        ->assertJsonPath('0.data.password', fn ($pw) => is_string($pw));
});

it('does not record a view when reading health data', function () {
    $user = User::factory()->create();
    VaultItem::factory()->count(3)->for($user)->create(['type' => 'login']);

    Sanctum::actingAs($user);

    $this->getJson('/api/vault-items/health')->assertOk();

    expect(DB::table('audit_logs')->where('action', 'item.viewed')->count())->toBe(0);
});
