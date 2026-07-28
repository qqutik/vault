<?php

declare(strict_types=1);

namespace App\Services;

use App\DTO\VaultItemDTO;
use App\Models\User;
use App\Models\VaultItem;
use App\Repositories\VaultItemRepository;
use Illuminate\Database\Eloquent\Collection;

class VaultItemService
{
    public function __construct(
        private readonly VaultItemRepository $items,
    ) {}

    /**
     * List a user's items, optionally scoped to a folder.
     *
     * @return Collection<int, VaultItem>
     */
    public function forUser(User $user, ?int $folderId = null): Collection
    {
        return $this->items->forUser($user, $folderId);
    }

    /**
     * Create a new item for the user.
     */
    public function create(User $user, VaultItemDTO $dto): VaultItem
    {
        return $this->items->create($user, $dto);
    }

    /**
     * Update an existing item.
     */
    public function update(VaultItem $item, VaultItemDTO $dto): VaultItem
    {
        return $this->items->update($item, $dto);
    }

    /**
     * Delete an item.
     */
    public function delete(VaultItem $item): void
    {
        $this->items->delete($item);
    }
}
