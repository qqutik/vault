<?php

declare(strict_types=1);

namespace App\Services;

use App\DTO\DashboardDTO;
use App\Models\User;

class DashboardService
{
    /**
     * Build the dashboard summary (owner + counts) for a user.
     *
     * @param  User  $user
     * @return DashboardDTO
     */
    public function forUser(User $user): DashboardDTO
    {
        return new DashboardDTO(
            user: $user,
            foldersCount: $user->folders()->count(),
            vaultItemsCount: $user->vaultItems()->count(),
            passkeysCount: $user->webAuthnCredentials()->count(),
            favoritesCount: $user->vaultItems()->where('favorite', true)->count(),
        );
    }
}
