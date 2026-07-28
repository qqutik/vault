<?php

declare(strict_types=1);

namespace App\Repositories;

use App\DTO\FolderDTO;
use App\DTO\FolderFilterDTO;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class FolderRepository
{
    /**
     * List a user's folders, ordered by name, optionally filtered by name search.
     *
     * @param  User  $user
     * @param  FolderFilterDTO  $filter
     * @return Collection<int, Folder>
     */
    public function forUser(User $user, FolderFilterDTO $filter): Collection
    {
        return $user->folders()
            ->when(
                $filter->getSearch() !== null,
                fn ($query) => $query->whereRaw(
                    'LOWER(name) LIKE ?',
                    ['%'.mb_strtolower((string) $filter->getSearch()).'%'],
                ),
            )
            ->orderBy('name')
            ->get();
    }

    /**
     * Find a folder by id.
     *
     * @param  int  $id
     * @return Folder|null
     */
    public function find(int $id): ?Folder
    {
        return Folder::query()->find($id);
    }

    /**
     * Create a folder for the user from the given DTO.
     *
     * @param  User  $user
     * @param  FolderDTO  $dto
     * @return Folder
     */
    public function create(User $user, FolderDTO $dto): Folder
    {
        return $user->folders()->create([
            'name' => $dto->getName(),
            'parent_id' => $dto->getParentId(),
        ]);
    }

    /**
     * Update a folder from the given DTO.
     *
     * @param  Folder  $folder
     * @param  FolderDTO  $dto
     * @return Folder
     */
    public function update(Folder $folder, FolderDTO $dto): Folder
    {
        $folder->update([
            'name' => $dto->getName(),
            'parent_id' => $dto->getParentId(),
        ]);

        return $folder;
    }

    /**
     * Delete a folder.
     *
     * @param  Folder  $folder
     * @return void
     */
    public function delete(Folder $folder): void
    {
        $folder->delete();
    }
}
