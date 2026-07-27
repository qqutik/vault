<?php

declare(strict_types=1);

namespace App\DTO;

use App\Models\User;

final class DashboardDTO extends BaseDTO
{
    public function __construct(
        protected User $user,
        protected int $foldersCount,
        protected int $vaultItemsCount,
        protected int $passkeysCount,
        protected int $favoritesCount,
    ) {}

    /**
     * Get the dashboard owner.
     */
    public function getUser(): User
    {
        return $this->user;
    }

    /**
     * Set the dashboard owner.
     */
    public function setUser(User $user): void
    {
        $this->user = $user;
    }

    /**
     * Get the number of folders.
     */
    public function getFoldersCount(): int
    {
        return $this->foldersCount;
    }

    /**
     * Set the number of folders.
     */
    public function setFoldersCount(int $foldersCount): void
    {
        $this->foldersCount = $foldersCount;
    }

    /**
     * Get the number of vault items.
     */
    public function getVaultItemsCount(): int
    {
        return $this->vaultItemsCount;
    }

    /**
     * Set the number of vault items.
     */
    public function setVaultItemsCount(int $vaultItemsCount): void
    {
        $this->vaultItemsCount = $vaultItemsCount;
    }

    /**
     * Get the number of registered passkeys.
     */
    public function getPasskeysCount(): int
    {
        return $this->passkeysCount;
    }

    /**
     * Set the number of registered passkeys.
     */
    public function setPasskeysCount(int $passkeysCount): void
    {
        $this->passkeysCount = $passkeysCount;
    }

    /**
     * Get the number of favorite items.
     */
    public function getFavoritesCount(): int
    {
        return $this->favoritesCount;
    }

    /**
     * Set the number of favorite items.
     */
    public function setFavoritesCount(int $favoritesCount): void
    {
        $this->favoritesCount = $favoritesCount;
    }
}
