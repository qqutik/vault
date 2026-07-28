<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\DTO\VaultItemDTO;
use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\VaultItem\StoreVaultItemRequest;
use App\Http\Requests\VaultItem\UpdateVaultItemRequest;
use App\Http\Resources\VaultItemResource;
use App\Models\User;
use App\Models\VaultItem;
use App\Services\Audit\AuditLogger;
use App\Services\VaultItemService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class VaultItemController extends Controller
{
    /**
     * @param  VaultItemService  $items
     * @param  AuditLogger  $audit
     */
    public function __construct(
        private readonly VaultItemService $items,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * List the current user's items (metadata only), optionally by folder.
     *
     * @param  Request  $request
     * @return AnonymousResourceCollection
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
     *
     * @param  StoreVaultItemRequest  $request
     * @return VaultItemResource
     */
    public function store(StoreVaultItemRequest $request): VaultItemResource
    {
        $this->authorize('create', VaultItem::class);

        /** @var User $user */
        $user = $request->user();

        $item = $this->items->create($user, VaultItemDTO::fromArray($request->validated()));

        $this->audit->log(AuditAction::ItemCreated, $item);

        return (new VaultItemResource($item))->withData();
    }

    /**
     * Show a single item, including its decrypted secret payload.
     *
     * @param  VaultItem  $vaultItem
     * @return VaultItemResource
     */
    public function show(VaultItem $vaultItem): VaultItemResource
    {
        $this->authorize('view', $vaultItem);

        $this->audit->log(AuditAction::ItemViewed, $vaultItem);

        return (new VaultItemResource($vaultItem))->withData();
    }

    /**
     * Update an item.
     *
     * @param  UpdateVaultItemRequest  $request
     * @param  VaultItem  $vaultItem
     * @return VaultItemResource
     */
    public function update(UpdateVaultItemRequest $request, VaultItem $vaultItem): VaultItemResource
    {
        $this->authorize('update', $vaultItem);

        $item = $this->items->update($vaultItem, VaultItemDTO::fromArray($request->validated()));

        $this->audit->log(AuditAction::ItemUpdated, $item);

        return (new VaultItemResource($item))->withData();
    }

    /**
     * Delete an item.
     *
     * @param  VaultItem  $vaultItem
     * @return Response
     */
    public function destroy(VaultItem $vaultItem): Response
    {
        $this->authorize('delete', $vaultItem);

        $this->audit->log(AuditAction::ItemDeleted, $vaultItem);

        $this->items->delete($vaultItem);

        return response()->noContent();
    }
}
