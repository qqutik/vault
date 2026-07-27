<?php

declare(strict_types=1);

namespace App\Repositories;

use App\DTO\FolderDTO;
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

    public function create(User $user, FolderDTO $dto): Folder
    {
        return $user->folders()->create([
            'name' => $dto->getName(),
            'parent_id' => $dto->getParentId(),
        ]);
    }

    public function update(Folder $folder, FolderDTO $dto): Folder
    {
        $folder->update([
            'name' => $dto->getName(),
            'parent_id' => $dto->getParentId(),
        ]);

        return $folder;
    }

    public function delete(Folder $folder): void
    {
        $folder->delete();
    }
}
