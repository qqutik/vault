<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AuditLogRepository
{
    /** Default page size for the activity feed. */
    public const PER_PAGE = 10;

    /**
     * Paginate a user's most recent audit entries.
     *
     * @param  User  $user
     * @param  int  $perPage
     * @return LengthAwarePaginator<int, AuditLog>
     */
    public function paginateForUser(User $user, int $perPage = self::PER_PAGE): LengthAwarePaginator
    {
        return $user->auditLogs()->latest()->paginate($perPage);
    }
}
