<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Models\VaultItem;

class VaultItemPolicy
{
    /**
     * @param  User  $user
     * @return bool
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * @param  User  $user
     * @param  VaultItem  $item
     * @return bool
     */
    public function view(User $user, VaultItem $item): bool
    {
        return $this->owns($user, $item);
    }

    /**
     * @param  User  $user
     * @return bool
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * @param  User  $user
     * @param  VaultItem  $item
     * @return bool
     */
    public function update(User $user, VaultItem $item): bool
    {
        return $this->owns($user, $item);
    }

    /**
     * @param  User  $user
     * @param  VaultItem  $item
     * @return bool
     */
    public function delete(User $user, VaultItem $item): bool
    {
        return $this->owns($user, $item);
    }

    /**
     * Whether the user owns the item.
     *
     * @param  User  $user
     * @param  VaultItem  $item
     * @return bool
     */
    private function owns(User $user, VaultItem $item): bool
    {
        return $item->user_id === $user->id;
    }
}
