<?php

declare(strict_types=1);

namespace App\Repositories;

use App\DTO\VaultItemDTO;
use App\Models\User;
use App\Models\VaultItem;
use Illuminate\Database\Eloquent\Collection;

class VaultItemRepository
{
    /**
     * List a user's items, optionally scoped to a folder.
     *
     * @param  User  $user
     * @param  int|null  $folderId
     * @return Collection<int, VaultItem>
     */
    public function forUser(User $user, ?int $folderId = null): Collection
    {
        return $user->vaultItems()
            ->when($folderId !== null, fn ($query) => $query->where('folder_id', $folderId))
            ->orderBy('title')
            ->get();
    }

    /**
     * Create an item for the user from the given DTO.
     *
     * @param  User  $user
     * @param  VaultItemDTO  $dto
     * @return VaultItem
     */
    public function create(User $user, VaultItemDTO $dto): VaultItem
    {
        return $user->vaultItems()->create([
            'folder_id' => $dto->getFolderId(),
            'type' => $dto->getType(),
            'title' => $dto->getTitle(),
            'data' => $dto->getData(),
            'favorite' => $dto->getFavorite(),
        ]);
    }

    /**
     * Update an item from the given DTO.
     *
     * @param  VaultItem  $item
     * @param  VaultItemDTO  $dto
     * @return VaultItem
     */
    public function update(VaultItem $item, VaultItemDTO $dto): VaultItem
    {
        $item->update([
            'folder_id' => $dto->getFolderId(),
            'type' => $dto->getType(),
            'title' => $dto->getTitle(),
            'data' => $dto->getData(),
            'favorite' => $dto->getFavorite(),
        ]);

        return $item;
    }

    /**
     * Delete an item.
     *
     * @param  VaultItem  $item
     * @return void
     */
    public function delete(VaultItem $item): void
    {
        $item->delete();
    }
}
