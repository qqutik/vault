<?php

declare(strict_types=1);

namespace App\Jobs;

use App\DTO\AuditEntryDTO;
use App\Enums\AuditAction;
use App\Events\AuditLogRecorded;
use App\Models\AuditLog;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class RecordAuditLog implements ShouldQueue
{
    use Queueable;

    /**
     * Read-type actions that a SPA may fire repeatedly for the same target in a
     * short span (re-render, prefetch, StrictMode). Collapse duplicates so the
     * activity feed shows one entry per meaningful access.
     */
    private const DEDUPE_WINDOW_SECONDS = 10;

    /** @var array<int, AuditAction> */
    private const DEDUPE_ACTIONS = [AuditAction::ItemViewed];

    /**
     * @param  AuditEntryDTO  $entry  Pre-captured audit data (scalars only, so it
     *                                serializes safely onto the queue).
     */
    public function __construct(
        private readonly AuditEntryDTO $entry,
    ) {}

    /**
     * Persist the audit entry.
     *
     * @return void
     */
    public function handle(): void
    {
        if ($this->isDuplicateRead()) {
            return;
        }

        $log = AuditLog::query()->create([
            'user_id' => $this->entry->getUserId(),
            'action' => $this->entry->getAction(),
            'auditable_type' => $this->entry->getAuditableType(),
            'auditable_id' => $this->entry->getAuditableId(),
            'ip' => $this->entry->getIp(),
            'user_agent' => $this->entry->getUserAgent(),
        ]);

        // Push the new entry to the owner's live activity feed.
        if ($log->user_id !== null) {
            AuditLogRecorded::dispatch($log);
        }
    }

    /**
     * Whether this entry repeats a recent read of the same target by the same
     * user and should be dropped to avoid duplicate activity rows.
     *
     * @return bool
     */
    private function isDuplicateRead(): bool
    {
        $action = AuditAction::tryFrom($this->entry->getAction());

        if ($action === null
            || ! in_array($action, self::DEDUPE_ACTIONS, true)
            || $this->entry->getUserId() === null
            || $this->entry->getAuditableId() === null) {
            return false;
        }

        return AuditLog::query()
            ->where('user_id', $this->entry->getUserId())
            ->where('action', $this->entry->getAction())
            ->where('auditable_type', $this->entry->getAuditableType())
            ->where('auditable_id', $this->entry->getAuditableId())
            ->where('created_at', '>=', now()->subSeconds(self::DEDUPE_WINDOW_SECONDS))
            ->exists();
    }
}
