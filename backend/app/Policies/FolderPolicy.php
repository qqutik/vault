<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Folder;
use App\Models\User;

class FolderPolicy
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
     * @param  Folder  $folder
     * @return bool
     */
    public function view(User $user, Folder $folder): bool
    {
        return $this->owns($user, $folder);
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
     * @param  Folder  $folder
     * @return bool
     */
    public function update(User $user, Folder $folder): bool
    {
        return $this->owns($user, $folder);
    }

    /**
     * @param  User  $user
     * @param  Folder  $folder
     * @return bool
     */
    public function delete(User $user, Folder $folder): bool
    {
        return $this->owns($user, $folder);
    }

    /**
     * Whether the user owns the folder.
     *
     * @param  User  $user
     * @param  Folder  $folder
     * @return bool
     */
    private function owns(User $user, Folder $folder): bool
    {
        return $folder->user_id === $user->id;
    }
}
