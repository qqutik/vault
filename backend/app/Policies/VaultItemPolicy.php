<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use App\Models\VaultItem;

class VaultItemPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, VaultItem $item): bool
    {
        return $this->owns($user, $item);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, VaultItem $item): bool
    {
        return $this->owns($user, $item);
    }

    public function delete(User $user, VaultItem $item): bool
    {
        return $this->owns($user, $item);
    }

    private function owns(User $user, VaultItem $item): bool
    {
        return $item->user_id === $user->id;
    }
}
