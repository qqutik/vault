<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('requires a name and email for registration options', function () {
    $this->postJson('/api/auth/register/options', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['name', 'email']);
});

it('creates a pending user and returns passkey options', function () {
    $response = $this->postJson('/api/auth/register/options', [
        'name' => 'Yuliy',
        'email' => 'yuliy@example.com',
    ]);

    $response->assertOk()
        ->assertJsonStructure(['challenge', 'rp', 'user', 'pubKeyCredParams']);

    $this->assertDatabaseHas('users', [
        'email' => 'yuliy@example.com',
        'name' => 'Yuliy',
    ]);
});

it('rejects registration when the email already owns a passkey', function () {
    $user = User::factory()->create(['email' => 'taken@example.com']);

    $user->webAuthnCredentials()->make()->forceFill([
        'id' => 'test-credential-id',
        'user_id' => $user->webAuthnId()->getBytes(),
        'counter' => 0,
        'rp_id' => 'localhost',
        'origin' => 'http://localhost',
        'aaguid' => '00000000-0000-0000-0000-000000000000',
        'public_key' => 'test-key',
        'attestation_format' => 'none',
    ])->save();

    $this->postJson('/api/auth/register/options', [
        'name' => 'Someone Else',
        'email' => 'taken@example.com',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('email');
});
