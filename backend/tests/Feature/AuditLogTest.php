<?php

declare(strict_types=1);

use App\DTO\AuditEntryDTO;
use App\Enums\AuditAction;
use App\Jobs\RecordAuditLog;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\VaultItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

it('queues an audit job when an item is created', function () {
    Queue::fake();
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/vault-items', [
        'type' => 'login',
        'title' => 'X',
        'data' => ['password' => 'x'],
    ])->assertCreated();

    Queue::assertPushed(RecordAuditLog::class);
});

it('queues an audit job when an item is viewed', function () {
    Queue::fake();
    $user = User::factory()->create();
    $item = VaultItem::factory()->for($user)->create();
    Sanctum::actingAs($user);

    $this->getJson("/api/vault-items/{$item->id}")->assertOk();

    Queue::assertPushed(RecordAuditLog::class);
});

it('writes an audit row when the job runs', function () {
    $user = User::factory()->create();

    $entry = new AuditEntryDTO(
        action: AuditAction::ItemViewed->value,
        userId: $user->id,
        auditableType: 'vault_item',
        auditableId: 5,
        ip: '127.0.0.1',
        userAgent: 'PHPUnit',
    );

    (new RecordAuditLog($entry))->handle();

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $user->id,
        'action' => 'item.viewed',
        'auditable_id' => 5,
    ]);
});

it('returns only the current user recent activity', function () {
    $user = User::factory()->create();
    AuditLog::create(['user_id' => $user->id, 'action' => 'login.success']);
    AuditLog::create(['user_id' => User::factory()->create()->id, 'action' => 'login.success']);

    Sanctum::actingAs($user);

    $this->getJson('/api/audit-logs')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonFragment(['action' => 'login.success']);
});
