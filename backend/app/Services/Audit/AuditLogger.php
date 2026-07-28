<?php

declare(strict_types=1);

namespace App\Services\Audit;

use App\DTO\AuditEntryDTO;
use App\Enums\AuditAction;
use App\Jobs\RecordAuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AuditLogger
{
    /**
     * @param  Request  $request
     */
    public function __construct(
        private readonly Request $request,
    ) {}

    /**
     * Queue an audit entry. Request context (ip / user agent) is captured now;
     * the row is written asynchronously by the RecordAuditLog job.
     *
     * @param  AuditAction  $action
     * @param  Model|null  $auditable  The entity the action targets, if any.
     * @param  User|null  $user  The acting user (defaults to the request user).
     * @return void
     */
    public function log(AuditAction $action, ?Model $auditable = null, ?User $user = null): void
    {
        $actor = $user ?? $this->request->user();

        $entry = new AuditEntryDTO(
            action: $action->value,
            userId: $actor?->getAuthIdentifier() !== null ? (int) $actor->getAuthIdentifier() : null,
            auditableType: $auditable?->getMorphClass(),
            auditableId: $auditable?->getKey() !== null ? (int) $auditable->getKey() : null,
            ip: $this->request->ip(),
            userAgent: mb_substr((string) $this->request->userAgent(), 0, 255),
        );

        RecordAuditLog::dispatch($entry);
    }
}
