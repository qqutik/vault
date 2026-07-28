<?php

declare(strict_types=1);

namespace App\DTO;

use App\Models\User;

final class DashboardDTO extends BaseDTO
{
    /**
     * @param  User  $user  Dashboard owner.
     * @param  int  $foldersCount  Number of folders.
     * @param  int  $vaultItemsCount  Number of vault items.
     * @param  int  $passkeysCount  Number of registered passkeys.
     * @param  int  $favoritesCount  Number of favorite items.
     */
    public function __construct(
        protected User $user,
        protected int $foldersCount,
        protected int $vaultItemsCount,
        protected int $passkeysCount,
        protected int $favoritesCount,
    ) {}

    /**
     * Get the dashboard owner.
     *
     * @return User
     */
    public function getUser(): User
    {
        return $this->user;
    }

    /**
     * Set the dashboard owner.
     *
     * @param  User  $user
     * @return void
     */
    public function setUser(User $user): void
    {
        $this->user = $user;
    }

    /**
     * Get the number of folders.
     *
     * @return int
     */
    public function getFoldersCount(): int
    {
        return $this->foldersCount;
    }

    /**
     * Set the number of folders.
     *
     * @param  int  $foldersCount
     * @return void
     */
    public function setFoldersCount(int $foldersCount): void
    {
        $this->foldersCount = $foldersCount;
    }

    /**
     * Get the number of vault items.
     *
     * @return int
     */
    public function getVaultItemsCount(): int
    {
        return $this->vaultItemsCount;
    }

    /**
     * Set the number of vault items.
     *
     * @param  int  $vaultItemsCount
     * @return void
     */
    public function setVaultItemsCount(int $vaultItemsCount): void
    {
        $this->vaultItemsCount = $vaultItemsCount;
    }

    /**
     * Get the number of registered passkeys.
     *
     * @return int
     */
    public function getPasskeysCount(): int
    {
        return $this->passkeysCount;
    }

    /**
     * Set the number of registered passkeys.
     *
     * @param  int  $passkeysCount
     * @return void
     */
    public function setPasskeysCount(int $passkeysCount): void
    {
        $this->passkeysCount = $passkeysCount;
    }

    /**
     * Get the number of favorite items.
     *
     * @return int
     */
    public function getFavoritesCount(): int
    {
        return $this->favoritesCount;
    }

    /**
     * Set the number of favorite items.
     *
     * @param  int  $favoritesCount
     * @return void
     */
    public function setFavoritesCount(int $favoritesCount): void
    {
        $this->favoritesCount = $favoritesCount;
    }
}
