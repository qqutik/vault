<?php

declare(strict_types=1);

namespace App\Repositories;

use App\DTO\VaultItemDTO;
use App\DTO\VaultItemFilterDTO;
use App\Models\User;
use App\Models\VaultItem;
use Illuminate\Database\Eloquent\Collection;

class VaultItemRepository
{
    /**
     * List a user's items, applying the given filters.
     *
     * @param  User  $user
     * @param  VaultItemFilterDTO  $filter
     * @return Collection<int, VaultItem>
     */
    public function forUser(User $user, VaultItemFilterDTO $filter): Collection
    {
        return $user->vaultItems()
            ->when(
                $filter->getFolderId() !== null,
                fn ($query) => $query->where('folder_id', $filter->getFolderId()),
            )
            ->when(
                $filter->getType() !== null,
                fn ($query) => $query->where('type', $filter->getType()),
            )
            ->when(
                $filter->getFavorite() !== null,
                fn ($query) => $query->where('favorite', $filter->getFavorite()),
            )
            ->when(
                $filter->getSearch() !== null,
                fn ($query) => $query->whereRaw(
                    'LOWER(title) LIKE ?',
                    ['%'.mb_strtolower((string) $filter->getSearch()).'%'],
                ),
            )
            ->orderBy('title')
            ->get();
    }

    /**
     * Login items (with their encrypted `data`) eligible for password-health
     * analysis: the user's own, non-step-up items. Protected (`require_reauth`)
     * items are excluded — they only open via a fresh passkey assertion.
     *
     * @param  User  $user
     * @return Collection<int, VaultItem>
     */
    public function healthDataFor(User $user): Collection
    {
        return $user->vaultItems()
            ->where('type', 'login')
            ->where('require_reauth', false)
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
            'require_reauth' => $dto->getRequireReauth(),
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
            'require_reauth' => $dto->getRequireReauth(),
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
