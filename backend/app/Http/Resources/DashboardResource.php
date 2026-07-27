<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\DTO\DashboardData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin DashboardData
 */
class DashboardResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var DashboardData $data */
        $data = $this->resource;

        return [
            'user' => new UserResource($data->user),
            'stats' => [
                'folders' => $data->foldersCount,
                'vault_items' => $data->vaultItemsCount,
                'passkeys' => $data->passkeysCount,
                'favorites' => $data->favoritesCount,
            ],
        ];
    }
}
