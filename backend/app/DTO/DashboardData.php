<?php

declare(strict_types=1);

namespace App\DTO;

use App\Models\User;

final readonly class DashboardData
{
    public function __construct(
        public User $user,
        public int $foldersCount,
        public int $vaultItemsCount,
        public int $passkeysCount,
        public int $favoritesCount,
    ) {}
}
