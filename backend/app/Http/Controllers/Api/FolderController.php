<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\DTO\FolderData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Folder\StoreFolderRequest;
use App\Http\Requests\Folder\UpdateFolderRequest;
use App\Http\Resources\FolderResource;
use App\Models\Folder;
use App\Models\User;
use App\Services\FolderService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class FolderController extends Controller
{
    public function __construct(
        private readonly FolderService $folders,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Folder::class);

        /** @var User $user */
        $user = $request->user();

        return FolderResource::collection($this->folders->forUser($user));
    }

    public function store(StoreFolderRequest $request): FolderResource
    {
        $this->authorize('create', Folder::class);

        /** @var User $user */
        $user = $request->user();

        $folder = $this->folders->create($user, FolderData::fromArray($request->validated()));

        return new FolderResource($folder);
    }

    public function show(Folder $folder): FolderResource
    {
        $this->authorize('view', $folder);

        return new FolderResource($folder);
    }

    public function update(UpdateFolderRequest $request, Folder $folder): FolderResource
    {
        $this->authorize('update', $folder);

        $folder = $this->folders->update($folder, FolderData::fromArray($request->validated()));

        return new FolderResource($folder);
    }

    public function destroy(Folder $folder): Response
    {
        $this->authorize('delete', $folder);

        $this->folders->delete($folder);

        return response()->noContent();
    }
}
