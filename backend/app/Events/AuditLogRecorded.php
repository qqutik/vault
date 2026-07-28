<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\AuditLog;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AuditLogRecorded implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  AuditLog  $auditLog
     */
    public function __construct(
        public AuditLog $auditLog,
    ) {}

    /**
     * The private channel the event broadcasts on (the owning user's feed).
     *
     * @return PrivateChannel
     */
    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("user.{$this->auditLog->user_id}.activity");
    }

    /**
     * The client-facing event name.
     *
     * @return string
     */
    public function broadcastAs(): string
    {
        return 'audit.recorded';
    }

    /**
     * The payload sent to the client (matches AuditLogResource).
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->auditLog->id,
            'action' => $this->auditLog->action,
            'auditable_type' => $this->auditLog->auditable_type,
            'auditable_id' => $this->auditLog->auditable_id,
            'ip' => $this->auditLog->ip,
            'user_agent' => $this->auditLog->user_agent,
            'created_at' => $this->auditLog->created_at,
        ];
    }
}
