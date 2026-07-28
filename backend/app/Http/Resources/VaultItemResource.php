<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\VaultItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin VaultItem
 */
class VaultItemResource extends JsonResource
{
    /**
     * Whether to include the decrypted secret payload (detail view only).
     */
    protected bool $withData = false;

    /**
     * Include the decrypted secret payload in the output.
     *
     * @return static
     */
    public function withData(): static
    {
        $this->withData = true;

        return $this;
    }

    /**
     * @param  Request  $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'folder_id' => $this->folder_id,
            'type' => $this->type,
            'title' => $this->title,
            'favorite' => $this->favorite,
            'require_reauth' => $this->require_reauth,
            'data' => $this->when($this->withData, fn (): array => $this->data),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
