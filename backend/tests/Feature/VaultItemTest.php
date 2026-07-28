<?php

declare(strict_types=1);

use App\Models\Folder;
use App\Models\User;
use App\Models\VaultItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

it('rejects unauthenticated access', function () {
    $this->getJson('/api/vault-items')->assertUnauthorized();
});

it('lists only the current user items without secret data', function () {
    $user = User::factory()->create();
    VaultItem::factory()->count(2)->for($user)->create();
    VaultItem::factory()->create(); // another user's item

    Sanctum::actingAs($user);

    $this->getJson('/api/vault-items')
        ->assertOk()
        ->assertJsonCount(2)
        ->assertJsonMissingPath('0.data');
});

it('creates an item and encrypts the payload at rest', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/vault-items', [
        'type' => 'login',
        'title' => 'GitHub',
        'data' => ['username' => 'yuliy', 'password' => 'super-secret-123'],
    ])
        ->assertCreated()
        ->assertJson([
            'title' => 'GitHub',
            'type' => 'login',
            'data' => ['username' => 'yuliy', 'password' => 'super-secret-123'],
        ]);

    // Stored column must not contain the plaintext secret.
    $raw = DB::table('vault_items')->where('user_id', $user->id)->value('data');
    expect($raw)->not->toContain('super-secret-123');
});

it('rejects a folder that belongs to another user', function () {
    $user = User::factory()->create();
    $othersFolder = Folder::factory()->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/vault-items', [
        'type' => 'login',
        'title' => 'X',
        'data' => ['password' => 'x'],
        'folder_id' => $othersFolder->id,
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('folder_id');
});

it('shows a single item with decrypted data', function () {
    $user = User::factory()->create();
    $item = VaultItem::factory()->for($user)->create([
        'title' => 'Note',
        'data' => ['note' => 'hello'],
    ]);

    Sanctum::actingAs($user);

    $this->getJson("/api/vault-items/{$item->id}")
        ->assertOk()
        ->assertJson(['title' => 'Note', 'data' => ['note' => 'hello']]);
});

it('forbids viewing another user item', function () {
    $user = User::factory()->create();
    $othersItem = VaultItem::factory()->create();

    Sanctum::actingAs($user);

    $this->getJson("/api/vault-items/{$othersItem->id}")->assertForbidden();
});

it('updates an own item', function () {
    $user = User::factory()->create();
    $item = VaultItem::factory()->for($user)->create(['title' => 'Old']);

    Sanctum::actingAs($user);

    $this->putJson("/api/vault-items/{$item->id}", [
        'type' => 'secure_note',
        'title' => 'New',
        'data' => ['note' => 'updated'],
        'favorite' => true,
    ])
        ->assertOk()
        ->assertJson(['title' => 'New', 'type' => 'secure_note', 'favorite' => true]);
});

it('deletes an own item', function () {
    $user = User::factory()->create();
    $item = VaultItem::factory()->for($user)->create();

    Sanctum::actingAs($user);

    $this->deleteJson("/api/vault-items/{$item->id}")->assertNoContent();

    $this->assertDatabaseMissing('vault_items', ['id' => $item->id]);
});

it('forbids deleting another user item', function () {
    $user = User::factory()->create();
    $othersItem = VaultItem::factory()->create();

    Sanctum::actingAs($user);

    $this->deleteJson("/api/vault-items/{$othersItem->id}")->assertForbidden();
});
