<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\User;
use App\Repositories\RecoveryCodeRepository;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RecoveryCodeService
{
    /** Number of one-time recovery codes generated per user. */
    private const COUNT = 10;

    /**
     * @param  RecoveryCodeRepository  $recoveryCodes
     */
    public function __construct(
        private readonly RecoveryCodeRepository $recoveryCodes,
    ) {}

    /**
     * Generate a fresh set of recovery codes, persist their hashes, and return
     * the plaintext codes. The plaintext is shown to the user exactly once.
     *
     * @param  User  $user
     * @return list<string>
     */
    public function generateFor(User $user): array
    {
        $codes = [];
        $hashes = [];

        for ($i = 0; $i < self::COUNT; $i++) {
            $code = $this->makeCode();
            $codes[] = $code;
            $hashes[] = Hash::make($code);
        }

        $this->recoveryCodes->replaceForUser($user, $hashes);

        return $codes;
    }

    /**
     * Build a single formatted recovery code.
     *
     * @return string
     */
    private function makeCode(): string
    {
        return sprintf(
            '%s-%s-%s',
            Str::upper(Str::random(4)),
            Str::upper(Str::random(4)),
            Str::upper(Str::random(4)),
        );
    }
}
