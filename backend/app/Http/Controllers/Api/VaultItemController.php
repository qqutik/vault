<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\DTO\VaultItemDTO;
use App\Http\Controllers\Controller;
use App\Http\Requests\VaultItem\StoreVaultItemRequest;
use App\Http\Requests\VaultItem\UpdateVaultItemRequest;
use App\Http\Resources\VaultItemResource;
use App\Models\User;
use App\Models\VaultItem;
use App\Services\VaultItemService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class VaultItemController extends Controller
{
    public function __construct(
        private readonly VaultItemService $items,
    ) {}

    /**
     * List the current user's items (metadata only), optionally by folder.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', VaultItem::class);

        /** @var User $user */
        $user = $request->user();

        $folderId = $request->query('folder_id');

        return VaultItemResource::collection(
            $this->items->forUser($user, $folderId !== null ? (int) $folderId : null),
        );
    }

    /**
     * Create a new item.
     */
    public function store(StoreVaultItemRequest $request): VaultItemResource
    {
        $this->authorize('create', VaultItem::class);

        /** @var User $user */
        $user = $request->user();

        $item = $this->items->create($user, VaultItemDTO::fromArray($request->validated()));

        return (new VaultItemResource($item))->withData();
    }

    /**
     * Show a single item, including its decrypted secret payload.
     */
    public function show(VaultItem $vaultItem): VaultItemResource
    {
        $this->authorize('view', $vaultItem);

        return (new VaultItemResource($vaultItem))->withData();
    }

    /**
     * Update an item.
     */
    public function update(UpdateVaultItemRequest $request, VaultItem $vaultItem): VaultItemResource
    {
        $this->authorize('update', $vaultItem);

        $item = $this->items->update($vaultItem, VaultItemDTO::fromArray($request->validated()));

        return (new VaultItemResource($item))->withData();
    }

    /**
     * Delete an item.
     */
    public function destroy(VaultItem $vaultItem): Response
    {
        $this->authorize('delete', $vaultItem);

        $this->items->delete($vaultItem);

        return response()->noContent();
    }
}
