<?php

declare(strict_types=1);

namespace App\Repositories;

use App\DTO\RegisterUserDTO;
use App\Models\User;

class UserRepository
{
    /**
     * Find a user by e-mail address.
     *
     * @param  string  $email
     * @return User|null
     */
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
     *
     * @param  RegisterUserDTO  $dto
     * @return User
     */
    public function firstOrCreateForRegistration(RegisterUserDTO $dto): User
    {
        $user = $this->findByEmail($dto->getEmail());

        if ($user !== null) {
            $user->update(['name' => $dto->getName()]);

            return $user;
        }

        return User::query()->create([
            'name' => $dto->getName(),
            'email' => $dto->getEmail(),
        ]);
    }
}
