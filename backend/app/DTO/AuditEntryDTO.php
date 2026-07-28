<?php

declare(strict_types=1);

namespace App\DTO;

final class AuditEntryDTO extends BaseDTO
{
    public function __construct(
        protected string $action,
        protected ?int $userId,
        protected ?string $auditableType,
        protected ?int $auditableId,
        protected ?string $ip,
        protected ?string $userAgent,
    ) {}

    /**
     * Build the DTO from an array.
     *
     * @param  array{action: string, user_id?: int|null, auditable_type?: string|null, auditable_id?: int|null, ip?: string|null, user_agent?: string|null}  $validated
     */
    public static function fromArray(array $validated): self
    {
        return new self(
            action: $validated['action'],
            userId: $validated['user_id'] ?? null,
            auditableType: $validated['auditable_type'] ?? null,
            auditableId: $validated['auditable_id'] ?? null,
            ip: $validated['ip'] ?? null,
            userAgent: $validated['user_agent'] ?? null,
        );
    }

    /**
     * Get the action key (e.g. "item.viewed").
     */
    public function getAction(): string
    {
        return $this->action;
    }

    /**
     * Set the action key.
     */
    public function setAction(string $action): void
    {
        $this->action = $action;
    }

    /**
     * Get the acting user id, or null for anonymous.
     */
    public function getUserId(): ?int
    {
        return $this->userId;
    }

    /**
     * Set the acting user id.
     */
    public function setUserId(?int $userId): void
    {
        $this->userId = $userId;
    }

    /**
     * Get the audited entity morph type, if any.
     */
    public function getAuditableType(): ?string
    {
        return $this->auditableType;
    }

    /**
     * Set the audited entity morph type.
     */
    public function setAuditableType(?string $auditableType): void
    {
        $this->auditableType = $auditableType;
    }

    /**
     * Get the audited entity id, if any.
     */
    public function getAuditableId(): ?int
    {
        return $this->auditableId;
    }

    /**
     * Set the audited entity id.
     */
    public function setAuditableId(?int $auditableId): void
    {
        $this->auditableId = $auditableId;
    }

    /**
     * Get the request IP address.
     */
    public function getIp(): ?string
    {
        return $this->ip;
    }

    /**
     * Set the request IP address.
     */
    public function setIp(?string $ip): void
    {
        $this->ip = $ip;
    }

    /**
     * Get the request user agent.
     */
    public function getUserAgent(): ?string
    {
        return $this->userAgent;
    }

    /**
     * Set the request user agent.
     */
    public function setUserAgent(?string $userAgent): void
    {
        $this->userAgent = $userAgent;
    }
}
