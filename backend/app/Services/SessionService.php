<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\SessionRepository;
use Illuminate\Support\Carbon;

class SessionService
{
    /**
     * @param  SessionRepository  $sessions
     */
    public function __construct(
        private readonly SessionRepository $sessions,
    ) {}

    /**
     * List a user's active sessions as shaped arrays. The real session id is
     * never exposed — a SHA-256 digest is returned as an opaque handle.
     *
     * @param  int  $userId
     * @param  string  $currentId  The requesting session's real id.
     * @return list<array<string, mixed>>
     */
    public function forUser(int $userId, string $currentId): array
    {
        return $this->sessions->activeForUser($userId)
            ->map(fn (\stdClass $row): array => [
                'id' => hash('sha256', (string) $row->id),
                'ip' => $row->ip_address,
                'device' => $this->parseUserAgent($row->user_agent),
                'last_active' => Carbon::createFromTimestamp($row->last_activity)->toIso8601String(),
                'current' => hash_equals((string) $row->id, $currentId),
            ])
            ->all();
    }

    /**
     * Revoke a single session identified by its SHA-256 handle. The current
     * session cannot be revoked this way. Returns true when a row was deleted.
     *
     * @param  int  $userId
     * @param  string  $handle  SHA-256 of the target session id.
     * @param  string  $currentId  The requesting session's real id.
     * @return bool
     */
    public function revoke(int $userId, string $handle, string $currentId): bool
    {
        $target = $this->sessions->activeForUser($userId)
            ->first(fn (\stdClass $row): bool => hash_equals(hash('sha256', (string) $row->id), $handle));

        if ($target === null || hash_equals((string) $target->id, $currentId)) {
            return false;
        }

        return $this->sessions->deleteById((string) $target->id);
    }

    /**
     * Revoke every session for the user except the current one.
     *
     * @param  int  $userId
     * @param  string  $currentId  The requesting session's real id.
     * @return int Number of sessions revoked.
     */
    public function revokeOthers(int $userId, string $currentId): int
    {
        return $this->sessions->deleteOthers($userId, $currentId);
    }

    /**
     * Turn a raw User-Agent string into a friendly "Browser · OS" label.
     *
     * @param  string|null  $userAgent
     * @return string
     */
    private function parseUserAgent(?string $userAgent): string
    {
        if ($userAgent === null || $userAgent === '') {
            return 'Unknown device';
        }

        $browser = match (true) {
            str_contains($userAgent, 'Edg') => 'Edge',
            str_contains($userAgent, 'OPR'), str_contains($userAgent, 'Opera') => 'Opera',
            str_contains($userAgent, 'Firefox') => 'Firefox',
            str_contains($userAgent, 'Chrome') => 'Chrome',
            str_contains($userAgent, 'Safari') => 'Safari',
            default => 'Unknown browser',
        };

        $os = match (true) {
            str_contains($userAgent, 'Windows') => 'Windows',
            str_contains($userAgent, 'iPhone'), str_contains($userAgent, 'iPad') => 'iOS',
            str_contains($userAgent, 'Mac OS X'), str_contains($userAgent, 'Macintosh') => 'macOS',
            str_contains($userAgent, 'Android') => 'Android',
            str_contains($userAgent, 'Linux') => 'Linux',
            default => 'Unknown OS',
        };

        return "{$browser} · {$os}";
    }
}
