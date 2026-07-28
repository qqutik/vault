<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Laragear\WebAuthn\Models\WebAuthnCredential;

/**
 * @mixin WebAuthnCredential
 */
class PasskeyResource extends JsonResource
{
    /**
     * @param  Request  $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'alias' => $this->alias,
            'disabled' => $this->disabled_at !== null,
            'created_at' => $this->created_at,
        ];
    }
}
