<?php

declare(strict_types=1);

namespace App\Services;

use App\DTO\VaultItemDTO;
use App\DTO\VaultItemFilterDTO;
use App\Models\User;
use App\Models\VaultItem;
use App\Repositories\VaultItemRepository;
use Illuminate\Database\Eloquent\Collection;

class VaultItemService
{
    /**
     * @param  VaultItemRepository  $items
     */
    public function __construct(
        private readonly VaultItemRepository $items,
    ) {}

    /**
     * List a user's items, applying the given filters.
     *
     * @param  User  $user
     * @param  VaultItemFilterDTO  $filter
     * @return Collection<int, VaultItem>
     */
    public function forUser(User $user, VaultItemFilterDTO $filter): Collection
    {
        return $this->items->forUser($user, $filter);
    }

    /**
     * Create a new item for the user.
     *
     * @param  User  $user
     * @param  VaultItemDTO  $dto
     * @return VaultItem
     */
    public function create(User $user, VaultItemDTO $dto): VaultItem
    {
        return $this->items->create($user, $dto);
    }

    /**
     * Update an existing item.
     *
     * @param  VaultItem  $item
     * @param  VaultItemDTO  $dto
     * @return VaultItem
     */
    public function update(VaultItem $item, VaultItemDTO $dto): VaultItem
    {
        return $this->items->update($item, $dto);
    }

    /**
     * Delete an item.
     *
     * @param  VaultItem  $item
     * @return void
     */
    public function delete(VaultItem $item): void
    {
        $this->items->delete($item);
    }
}
