<?php

declare(strict_types=1);

namespace App\DTO;

final class AuditEntryDTO extends BaseDTO
{
    /**
     * @param  string  $action  Action key (e.g. "item.viewed").
     * @param  int|null  $userId  Acting user id, or null for anonymous.
     * @param  string|null  $auditableType  Audited entity morph type, if any.
     * @param  int|null  $auditableId  Audited entity id, if any.
     * @param  string|null  $ip  Request IP address.
     * @param  string|null  $userAgent  Request user agent.
     * @param  string  $occurredAt  When the action happened (captured at request
     *                              time, so a slow queue never skews the log).
     */
    public function __construct(
        protected string $action,
        protected ?int $userId,
        protected ?string $auditableType,
        protected ?int $auditableId,
        protected ?string $ip,
        protected ?string $userAgent,
        protected string $occurredAt,
    ) {}

    /**
     * Build the DTO from an array.
     *
     * @param  array{action: string, user_id?: int|null, auditable_type?: string|null, auditable_id?: int|null, ip?: string|null, user_agent?: string|null, occurred_at: string}  $validated
     * @return self
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
            occurredAt: $validated['occurred_at'],
        );
    }

    /**
     * Get the action key (e.g. "item.viewed").
     *
     * @return string
     */
    public function getAction(): string
    {
        return $this->action;
    }

    /**
     * Set the action key.
     *
     * @param  string  $action
     * @return void
     */
    public function setAction(string $action): void
    {
        $this->action = $action;
    }

    /**
     * Get the acting user id, or null for anonymous.
     *
     * @return int|null
     */
    public function getUserId(): ?int
    {
        return $this->userId;
    }

    /**
     * Set the acting user id.
     *
     * @param  int|null  $userId
     * @return void
     */
    public function setUserId(?int $userId): void
    {
        $this->userId = $userId;
    }

    /**
     * Get the audited entity morph type, if any.
     *
     * @return string|null
     */
    public function getAuditableType(): ?string
    {
        return $this->auditableType;
    }

    /**
     * Set the audited entity morph type.
     *
     * @param  string|null  $auditableType
     * @return void
     */
    public function setAuditableType(?string $auditableType): void
    {
        $this->auditableType = $auditableType;
    }

    /**
     * Get the audited entity id, if any.
     *
     * @return int|null
     */
    public function getAuditableId(): ?int
    {
        return $this->auditableId;
    }

    /**
     * Set the audited entity id.
     *
     * @param  int|null  $auditableId
     * @return void
     */
    public function setAuditableId(?int $auditableId): void
    {
        $this->auditableId = $auditableId;
    }

    /**
     * Get the request IP address.
     *
     * @return string|null
     */
    public function getIp(): ?string
    {
        return $this->ip;
    }

    /**
     * Set the request IP address.
     *
     * @param  string|null  $ip
     * @return void
     */
    public function setIp(?string $ip): void
    {
        $this->ip = $ip;
    }

    /**
     * Get the request user agent.
     *
     * @return string|null
     */
    public function getUserAgent(): ?string
    {
        return $this->userAgent;
    }

    /**
     * Set the request user agent.
     *
     * @param  string|null  $userAgent
     * @return void
     */
    public function setUserAgent(?string $userAgent): void
    {
        $this->userAgent = $userAgent;
    }

    /**
     * Get when the action happened (request-time capture).
     *
     * @return string
     */
    public function getOccurredAt(): string
    {
        return $this->occurredAt;
    }

    /**
     * Set when the action happened.
     *
     * @param  string  $occurredAt
     * @return void
     */
    public function setOccurredAt(string $occurredAt): void
    {
        $this->occurredAt = $occurredAt;
    }
}
