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

it('queues an audit job when a folder is created', function () {
    Queue::fake();
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/folders', ['name' => 'Work'])->assertCreated();

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
        occurredAt: now()->toDateTimeString(),
    );

    (new RecordAuditLog($entry))->handle();

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $user->id,
        'action' => 'item.viewed',
        'auditable_id' => 5,
    ]);
});

it('stamps the row with the request time, not the job run time', function () {
    $user = User::factory()->create();
    $occurredAt = now()->subMinutes(10)->toDateTimeString();

    $entry = new AuditEntryDTO(
        action: AuditAction::ItemViewed->value,
        userId: $user->id,
        auditableType: 'vault_item',
        auditableId: 5,
        ip: '127.0.0.1',
        userAgent: 'PHPUnit',
        occurredAt: $occurredAt,
    );

    (new RecordAuditLog($entry))->handle();

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $user->id,
        'created_at' => $occurredAt,
    ]);
});

it('returns only the current user recent activity', function () {
    $user = User::factory()->create();
    AuditLog::create(['user_id' => $user->id, 'action' => 'login.success']);
    AuditLog::create(['user_id' => User::factory()->create()->id, 'action' => 'login.success']);

    Sanctum::actingAs($user);

    $this->getJson('/api/audit-logs')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonFragment(['action' => 'login.success']);
});

it('paginates recent activity 10 per page', function () {
    $user = User::factory()->create();
    foreach (range(1, 13) as $i) {
        AuditLog::create(['user_id' => $user->id, 'action' => 'item.viewed']);
    }

    Sanctum::actingAs($user);

    $this->getJson('/api/audit-logs')
        ->assertOk()
        ->assertJsonCount(10, 'data')
        ->assertJsonPath('meta.total', 13)
        ->assertJsonPath('meta.last_page', 2);

    $this->getJson('/api/audit-logs?page=2')
        ->assertOk()
        ->assertJsonCount(3, 'data');
});
