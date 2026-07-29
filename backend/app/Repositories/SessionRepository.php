<?php

declare(strict_types=1);

namespace App\Repositories;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SessionRepository
{
    /**
     * Active session rows for a user, most recently active first.
     *
     * @param  int  $userId
     * @return Collection<int, \stdClass>
     */
    public function activeForUser(int $userId): Collection
    {
        return DB::table('sessions')
            ->where('user_id', $userId)
            ->orderByDesc('last_activity')
            ->get();
    }

    /**
     * Delete a session by its real id.
     *
     * @param  string  $id
     * @return bool
     */
    public function deleteById(string $id): bool
    {
        return DB::table('sessions')->where('id', $id)->delete() > 0;
    }

    /**
     * Delete every session for a user except the current one.
     *
     * @param  int  $userId
     * @param  string  $currentId
     * @return int Number of sessions deleted.
     */
    public function deleteOthers(int $userId, string $currentId): int
    {
        return DB::table('sessions')
            ->where('user_id', $userId)
            ->where('id', '!=', $currentId)
            ->delete();
    }
}
