<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\DTO\DashboardDTO;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin DashboardDTO
 */
class DashboardResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var DashboardDTO $dto */
        $dto = $this->resource;

        return [
            'user' => new UserResource($dto->getUser()),
            'stats' => [
                'folders' => $dto->getFoldersCount(),
                'vault_items' => $dto->getVaultItemsCount(),
                'passkeys' => $dto->getPasskeysCount(),
                'favorites' => $dto->getFavoritesCount(),
            ],
        ];
    }
}
