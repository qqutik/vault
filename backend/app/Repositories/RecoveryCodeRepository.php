<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\RecoveryCode;
use App\Models\User;

class RecoveryCodeRepository
{
    /**
     * Replace the user's recovery codes with the given hashes.
     *
     * @param  User  $user
     * @param  list<string>  $hashes
     * @return void
     */
    public function replaceForUser(User $user, array $hashes): void
    {
        $user->recoveryCodes()->delete();

        $user->recoveryCodes()->createMany(
            array_map(static fn (string $hash): array => ['code_hash' => $hash], $hashes),
        );
    }

    /**
     * The user's unused recovery codes.
     *
     * @param  User  $user
     * @return iterable<int, RecoveryCode>
     */
    public function unusedForUser(User $user): iterable
    {
        return $user->recoveryCodes()->whereNull('used_at')->get();
    }
}
