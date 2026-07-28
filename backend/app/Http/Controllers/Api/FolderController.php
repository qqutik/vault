<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\DTO\FolderDTO;
use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Folder\StoreFolderRequest;
use App\Http\Requests\Folder\UpdateFolderRequest;
use App\Http\Resources\FolderResource;
use App\Models\Folder;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\FolderService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class FolderController extends Controller
{
    /**
     * @param  FolderService  $folders
     * @param  AuditLogger  $audit
     */
    public function __construct(
        private readonly FolderService $folders,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * List the current user's folders.
     *
     * @param  Request  $request
     * @return AnonymousResourceCollection
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Folder::class);

        /** @var User $user */
        $user = $request->user();

        return FolderResource::collection($this->folders->forUser($user));
    }

    /**
     * Create a folder.
     *
     * @param  StoreFolderRequest  $request
     * @return FolderResource
     */
    public function store(StoreFolderRequest $request): FolderResource
    {
        $this->authorize('create', Folder::class);

        /** @var User $user */
        $user = $request->user();

        $folder = $this->folders->create($user, FolderDTO::fromArray($request->validated()));

        $this->audit->log(AuditAction::FolderCreated, $folder);

        return new FolderResource($folder);
    }

    /**
     * Show a single folder.
     *
     * @param  Folder  $folder
     * @return FolderResource
     */
    public function show(Folder $folder): FolderResource
    {
        $this->authorize('view', $folder);

        return new FolderResource($folder);
    }

    /**
     * Update a folder (rename / move).
     *
     * @param  UpdateFolderRequest  $request
     * @param  Folder  $folder
     * @return FolderResource
     */
    public function update(UpdateFolderRequest $request, Folder $folder): FolderResource
    {
        $this->authorize('update', $folder);

        $folder = $this->folders->update($folder, FolderDTO::fromArray($request->validated()));

        $this->audit->log(AuditAction::FolderUpdated, $folder);

        return new FolderResource($folder);
    }

    /**
     * Delete a folder.
     *
     * @param  Folder  $folder
     * @return Response
     */
    public function destroy(Folder $folder): Response
    {
        $this->authorize('delete', $folder);

        $this->audit->log(AuditAction::FolderDeleted, $folder);

        $this->folders->delete($folder);

        return response()->noContent();
    }
}
