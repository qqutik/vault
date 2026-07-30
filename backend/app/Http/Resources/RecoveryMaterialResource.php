<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Recovery-wrapped VMK material for a recovery-key unlock. Wraps a pre-built
 * array from EncryptionService.
 */
class RecoveryMaterialResource extends JsonResource
{
    /**
     * @param  Request  $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array<string, mixed> $material */
        $material = $this->resource;

        return [
            'wrapped_vmk' => $material['wrapped_vmk'],
            'wrap_iv' => $material['wrap_iv'],
            'salt' => $material['salt'],
        ];
    }
}
