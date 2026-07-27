<?php

declare(strict_types=1);

namespace App\Repositories;

use App\DTO\RegisterUserData;
use App\Models\User;

class UserRepository
{
    public function findByEmail(string $email): ?User
    {
        return User::query()->where('email', $email)->first();
    }

    /**
     * Resolve the user a passkey registration should attach to.
     *
     * Reuses an abandoned account (created but never finished a passkey), and
     * creates a fresh one otherwise. Callers must reject e-mails that already
     * own a credential before calling this (see PasskeyRegistrationService).
     */
    public function firstOrCreateForRegistration(RegisterUserData $data): User
    {
        $user = $this->findByEmail($data->email);

        if ($user !== null) {
            $user->update(['name' => $data->name]);

            return $user;
        }

        return User::query()->create([
            'name' => $data->name,
            'email' => $data->email,
        ]);
    }
}
