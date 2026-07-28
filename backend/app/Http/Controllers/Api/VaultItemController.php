<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\DTO\VaultItemDTO;
use App\DTO\VaultItemFilterDTO;
use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\VaultItem\IndexVaultItemRequest;
use App\Http\Requests\VaultItem\StoreVaultItemRequest;
use App\Http\Requests\VaultItem\UpdateVaultItemRequest;
use App\Http\Resources\VaultItemResource;
use App\Models\User;
use App\Models\VaultItem;
use App\Services\Audit\AuditLogger;
use App\Services\Auth\PasskeyAssertionService;
use App\Services\VaultItemService;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Laragear\WebAuthn\Http\Requests\AssertionRequest;

class VaultItemController extends Controller
{
    /**
     * @param  VaultItemService  $items
     * @param  AuditLogger  $audit
     */
    public function __construct(
        private readonly VaultItemService $items,
        private readonly AuditLogger $audit,
        private readonly PasskeyAssertionService $assertion,
    ) {}

    /**
     * List the current user's items (metadata only) with search / filters.
     *
     * @param  IndexVaultItemRequest  $request
     * @return AnonymousResourceCollection
     */
    public function index(IndexVaultItemRequest $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', VaultItem::class);

        /** @var User $user */
        $user = $request->user();

        $filter = VaultItemFilterDTO::fromArray($request->validated());

        return VaultItemResource::collection($this->items->forUser($user, $filter));
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
     * Show a single item. The secret payload is withheld for items that
     * require re-authentication — those must be opened via the unlock flow.
     *
     * @param  VaultItem  $vaultItem
     * @return VaultItemResource
     */
    public function show(VaultItem $vaultItem): VaultItemResource
    {
        $this->authorize('view', $vaultItem);

        if ($vaultItem->require_reauth) {
            return new VaultItemResource($vaultItem);
        }

        $this->audit->log(AuditAction::ItemViewed, $vaultItem);

        return (new VaultItemResource($vaultItem))->withData();
    }

    /**
     * Step 1 of unlocking a protected item — return passkey assertion options
     * scoped to the current user.
     *
     * @param  AssertionRequest  $request
     * @param  VaultItem  $vaultItem
     * @return Responsable
     */
    public function unlockOptions(AssertionRequest $request, VaultItem $vaultItem): Responsable
    {
        $this->authorize('view', $vaultItem);

        /** @var User $user */
        $user = $request->user();

        return $request->toVerify($user);
    }

    /**
     * Step 2 of unlocking a protected item — verify the passkey assertion for
     * the current user and, on success, return the decrypted secret payload.
     * No session or grace window is kept: every open re-prompts.
     *
     * @param  Request  $request
     * @param  VaultItem  $vaultItem
     * @return VaultItemResource
     */
    public function unlock(Request $request, VaultItem $vaultItem): VaultItemResource
    {
        $this->authorize('view', $vaultItem);

        /** @var User $user */
        $user = $request->user();

        $this->assertion->verifyForUser($user);

        $this->audit->log(AuditAction::ItemUnlocked, $vaultItem);

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
