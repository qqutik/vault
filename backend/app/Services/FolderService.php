<?php

declare(strict_types=1);

namespace App\Services;

use App\DTO\FolderDTO;
use App\Models\Folder;
use App\Models\User;
use App\Repositories\FolderRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class FolderService
{
    /**
     * @param  FolderRepository  $folders
     */
    public function __construct(
        private readonly FolderRepository $folders,
    ) {}

    /**
     * List a user's folders.
     *
     * @param  User  $user
     * @return Collection<int, Folder>
     */
    public function forUser(User $user): Collection
    {
        return $this->folders->forUser($user);
    }

    /**
     * Create a folder for the user.
     *
     * @param  User  $user
     * @param  FolderDTO  $dto
     * @return Folder
     */
    public function create(User $user, FolderDTO $dto): Folder
    {
        return $this->folders->create($user, $dto);
    }

    /**
     * Update a folder (rename / move), guarding against cycles.
     *
     * @param  Folder  $folder
     * @param  FolderDTO  $dto
     * @return Folder
     *
     * @throws ValidationException when the move would create a cycle.
     */
    public function update(Folder $folder, FolderDTO $dto): Folder
    {
        $this->guardAgainstCycle($folder, $dto->getParentId());

        return $this->folders->update($folder, $dto);
    }

    /**
     * Delete a folder.
     *
     * @param  Folder  $folder
     * @return void
     */
    public function delete(Folder $folder): void
    {
        $this->folders->delete($folder);
    }

    /**
     * A folder cannot become its own parent or a child of one of its own
     * descendants — walk up from the target parent and fail if we reach it.
     *
     * @param  Folder  $folder
     * @param  int|null  $parentId
     * @return void
     *
     * @throws ValidationException
     */
    private function guardAgainstCycle(Folder $folder, ?int $parentId): void
    {
        $currentId = $parentId;

        while ($currentId !== null) {
            if ($currentId === $folder->id) {
                throw ValidationException::withMessages([
                    'parent_id' => __('A folder cannot be moved into itself or its own descendants.'),
                ]);
            }

            $currentId = $this->folders->find($currentId)?->parent_id;
        }
    }
}
