<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shapes a single active-session entry. The resource wraps a pre-built array
 * from SessionService (the session id is already a SHA-256 handle).
 */
class SessionResource extends JsonResource
{
    /**
     * @param  Request  $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array<string, mixed> $session */
        $session = $this->resource;

        return [
            'id' => $session['id'],
            'ip' => $session['ip'],
            'device' => $session['device'],
            'last_active' => $session['last_active'],
            'current' => $session['current'],
        ];
    }
}
