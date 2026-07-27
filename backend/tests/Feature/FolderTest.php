<?php

declare(strict_types=1);

use App\Models\Folder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

it('rejects unauthenticated access', function () {
    $this->getJson('/api/folders')->assertUnauthorized();
});

it('lists only the current user folders', function () {
    $user = User::factory()->create();
    Folder::factory()->count(2)->for($user)->create();
    Folder::factory()->create(); // another user's folder

    Sanctum::actingAs($user);

    $this->getJson('/api/folders')
        ->assertOk()
        ->assertJsonCount(2);
});

it('creates a folder', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/folders', ['name' => 'Work'])
        ->assertCreated()
        ->assertJson(['name' => 'Work', 'parent_id' => null]);

    $this->assertDatabaseHas('folders', ['name' => 'Work', 'user_id' => $user->id]);
});

it('rejects a parent that belongs to another user', function () {
    $user = User::factory()->create();
    $othersFolder = Folder::factory()->create();

    Sanctum::actingAs($user);

    $this->postJson('/api/folders', ['name' => 'Nested', 'parent_id' => $othersFolder->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('parent_id');
});

it('forbids viewing another user folder', function () {
    $user = User::factory()->create();
    $othersFolder = Folder::factory()->create();

    Sanctum::actingAs($user);

    $this->getJson("/api/folders/{$othersFolder->id}")->assertForbidden();
});

it('updates an own folder', function () {
    $user = User::factory()->create();
    $folder = Folder::factory()->for($user)->create(['name' => 'Old']);

    Sanctum::actingAs($user);

    $this->putJson("/api/folders/{$folder->id}", ['name' => 'New'])
        ->assertOk()
        ->assertJson(['name' => 'New']);
});

it('prevents moving a folder into its own descendant', function () {
    $user = User::factory()->create();
    $parent = Folder::factory()->for($user)->create();
    $child = Folder::factory()->for($user)->create(['parent_id' => $parent->id]);

    Sanctum::actingAs($user);

    $this->putJson("/api/folders/{$parent->id}", ['name' => 'Parent', 'parent_id' => $child->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('parent_id');
});

it('deletes an own folder', function () {
    $user = User::factory()->create();
    $folder = Folder::factory()->for($user)->create();

    Sanctum::actingAs($user);

    $this->deleteJson("/api/folders/{$folder->id}")->assertNoContent();

    $this->assertDatabaseMissing('folders', ['id' => $folder->id]);
});

it('forbids deleting another user folder', function () {
    $user = User::factory()->create();
    $othersFolder = Folder::factory()->create();

    Sanctum::actingAs($user);

    $this->deleteJson("/api/folders/{$othersFolder->id}")->assertForbidden();
});
