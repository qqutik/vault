<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\User;

class AccessTokenService
{
    /** Default token name for a SPA session. */
    public const DEFAULT_NAME = 'spa';

    /**
     * Issue a personal access token (Sanctum) for the user and return the
     * plaintext token to hand back to the client once.
     */
    public function issue(User $user, string $name = self::DEFAULT_NAME): string
    {
        return $user->createToken($name)->plainTextToken;
    }
}
