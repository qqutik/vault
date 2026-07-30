<?php

declare(strict_types=1);

namespace App\Services;

use App\DTO\RecoveryKeyDTO;
use App\DTO\WrappedKeyDTO;
use App\Models\User;
use App\Models\VaultCredentialKey;
use App\Repositories\VaultCredentialKeyRepository;

class EncryptionService
{
    /**
     * @param  VaultCredentialKeyRepository  $keys
     */
    public function __construct(
        private readonly VaultCredentialKeyRepository $keys,
    ) {}

    /**
     * Ensure the user has a PRF salt (generate on first use) and report whether
     * zero-knowledge is already initialized (any passkey has a wrapped VMK).
     *
     * @param  User  $user
     * @return array{prf_salt: string, initialized: bool, recovery_available: bool}
     */
    public function bootstrap(User $user): array
    {
        if ($user->prf_salt === null) {
            $user->prf_salt = base64_encode(random_bytes(32));
            $user->save();
        }

        return [
            'prf_salt' => $user->prf_salt,
            'initialized' => $this->keys->existsForCredentialIds($this->credentialIds($user)),
            'recovery_available' => $user->recovery_wrapped_vmk !== null,
        ];
    }

    /**
     * The user's passkey credential ids that already have a wrapped VMK.
     *
     * @param  User  $user
     * @return list<string>
     */
    public function enrolledCredentialIds(User $user): array
    {
        return $this->keys->enrolledAmong($this->credentialIds($user));
    }

    /**
     * Store the recovery-wrapped VMK for the user.
     *
     * @param  User  $user
     * @param  RecoveryKeyDTO  $dto
     * @return void
     */
    public function storeRecovery(User $user, RecoveryKeyDTO $dto): void
    {
        $user->recovery_wrapped_vmk = $dto->getWrappedVmk();
        $user->recovery_wrap_iv = $dto->getWrapIv();
        $user->recovery_salt = $dto->getSalt();
        $user->save();
    }

    /**
     * The user's recovery-wrapped VMK material, or null when not set up.
     *
     * @param  User  $user
     * @return array{wrapped_vmk: string, wrap_iv: string, salt: string}|null
     */
    public function recoveryMaterial(User $user): ?array
    {
        if ($user->recovery_wrapped_vmk === null
            || $user->recovery_wrap_iv === null
            || $user->recovery_salt === null) {
            return null;
        }

        return [
            'wrapped_vmk' => $user->recovery_wrapped_vmk,
            'wrap_iv' => $user->recovery_wrap_iv,
            'salt' => $user->recovery_salt,
        ];
    }

    /**
     * The wrapped VMK for one of the user's passkeys, or null when absent or
     * the credential does not belong to the user.
     *
     * @param  User  $user
     * @param  string  $credentialId
     * @return VaultCredentialKey|null
     */
    public function wrappedKeyFor(User $user, string $credentialId): ?VaultCredentialKey
    {
        if (! $this->ownsCredential($user, $credentialId)) {
            return null;
        }

        return $this->keys->findByCredentialId($credentialId);
    }

    /**
     * Store a wrapped VMK for one of the user's passkeys.
     *
     * @param  User  $user
     * @param  WrappedKeyDTO  $dto
     * @return VaultCredentialKey
     */
    public function storeWrappedKey(User $user, WrappedKeyDTO $dto): VaultCredentialKey
    {
        return $this->keys->upsert($dto);
    }

    /**
     * Whether a credential id belongs to the given user.
     *
     * @param  User  $user
     * @param  string  $credentialId
     * @return bool
     */
    public function ownsCredential(User $user, string $credentialId): bool
    {
        return $user->webAuthnCredentials()->whereKey($credentialId)->exists();
    }

    /**
     * The user's passkey credential ids.
     *
     * @param  User  $user
     * @return list<string>
     */
    private function credentialIds(User $user): array
    {
        /** @var list<string> $ids */
        $ids = $user->webAuthnCredentials()->pluck('id')->all();

        return $ids;
    }
}
