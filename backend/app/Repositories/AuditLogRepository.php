<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class AuditLogRepository
{
    /**
     * The most recent audit entries for a user.
     *
     * @param  User  $user
     * @param  int  $limit
     * @return Collection<int, AuditLog>
     */
    public function forUser(User $user, int $limit = 50): Collection
    {
        return $user->auditLogs()->latest()->limit($limit)->get();
    }
}
