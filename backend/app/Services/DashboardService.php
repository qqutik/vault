<?php

declare(strict_types=1);

namespace App\Services;

use App\DTO\DashboardData;
use App\Models\User;

class DashboardService
{
    public function forUser(User $user): DashboardData
    {
        return new DashboardData(
            user: $user,
            foldersCount: $user->folders()->count(),
            vaultItemsCount: $user->vaultItems()->count(),
            passkeysCount: $user->webAuthnCredentials()->count(),
            favoritesCount: $user->vaultItems()->where('favorite', true)->count(),
        );
    }
}
