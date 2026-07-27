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
    public function __construct(
        private readonly FolderRepository $folders,
    ) {}

    /**
     * @return Collection<int, Folder>
     */
    public function forUser(User $user): Collection
    {
        return $this->folders->forUser($user);
    }

    public function create(User $user, FolderDTO $dto): Folder
    {
        return $this->folders->create($user, $dto);
    }

    /**
     * @throws ValidationException when the move would create a cycle.
     */
    public function update(Folder $folder, FolderDTO $dto): Folder
    {
        $this->guardAgainstCycle($folder, $dto->getParentId());

        return $this->folders->update($folder, $dto);
    }

    public function delete(Folder $folder): void
    {
        $this->folders->delete($folder);
    }

    /**
     * A folder cannot become its own parent or a child of one of its own
     * descendants — walk up from the target parent and fail if we reach it.
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
