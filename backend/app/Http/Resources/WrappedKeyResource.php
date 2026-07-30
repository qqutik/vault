<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\VaultCredentialKey;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin VaultCredentialKey
 */
class WrappedKeyResource extends JsonResource
{
    /**
     * @param  Request  $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'credential_id' => $this->webauthn_credential_id,
            'wrapped_vmk' => $this->wrapped_vmk,
            'wrap_iv' => $this->wrap_iv,
            'scheme' => $this->scheme,
        ];
    }
}
