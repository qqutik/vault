<?php

declare(strict_types=1);

namespace App\Repositories;

use App\DTO\FolderData;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class FolderRepository
{
    /**
     * @return Collection<int, Folder>
     */
    public function forUser(User $user): Collection
    {
        return $user->folders()->orderBy('name')->get();
    }

    public function find(int $id): ?Folder
    {
        return Folder::query()->find($id);
    }

    public function create(User $user, FolderData $data): Folder
    {
        return $user->folders()->create([
            'name' => $data->name,
            'parent_id' => $data->parentId,
        ]);
    }

    public function update(Folder $folder, FolderData $data): Folder
    {
        $folder->update([
            'name' => $data->name,
            'parent_id' => $data->parentId,
        ]);

        return $folder;
    }

    public function delete(Folder $folder): void
    {
        $folder->delete();
    }
}
