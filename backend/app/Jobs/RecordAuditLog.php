<?php

declare(strict_types=1);

namespace App\Jobs;

use App\DTO\AuditEntryDTO;
use App\Models\AuditLog;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class RecordAuditLog implements ShouldQueue
{
    use Queueable;

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
        AuditLog::query()->create([
            'user_id' => $this->entry->getUserId(),
            'action' => $this->entry->getAction(),
            'auditable_type' => $this->entry->getAuditableType(),
            'auditable_id' => $this->entry->getAuditableId(),
            'ip' => $this->entry->getIp(),
            'user_agent' => $this->entry->getUserAgent(),
        ]);
    }
}
