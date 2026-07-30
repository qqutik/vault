<?php

declare(strict_types=1);

namespace App\Repositories;

use App\DTO\WrappedKeyDTO;
use App\Models\VaultCredentialKey;

class VaultCredentialKeyRepository
{
    /**
     * Find the wrapped VMK for a passkey, or null when none is stored yet.
     *
     * @param  string  $credentialId
     * @return VaultCredentialKey|null
     */
    public function findByCredentialId(string $credentialId): ?VaultCredentialKey
    {
        return VaultCredentialKey::query()
            ->where('webauthn_credential_id', $credentialId)
            ->first();
    }

    /**
     * Whether any of the given passkeys already has a wrapped VMK.
     *
     * @param  list<string>  $credentialIds
     * @return bool
     */
    public function existsForCredentialIds(array $credentialIds): bool
    {
        return VaultCredentialKey::query()
            ->whereIn('webauthn_credential_id', $credentialIds)
            ->exists();
    }

    /**
     * Which of the given passkeys already have a wrapped VMK.
     *
     * @param  list<string>  $credentialIds
     * @return list<string>
     */
    public function enrolledAmong(array $credentialIds): array
    {
        /** @var list<string> $ids */
        $ids = VaultCredentialKey::query()
            ->whereIn('webauthn_credential_id', $credentialIds)
            ->pluck('webauthn_credential_id')
            ->all();

        return $ids;
    }

    /**
     * Create or update the wrapped VMK for a passkey.
     *
     * @param  WrappedKeyDTO  $dto
     * @return VaultCredentialKey
     */
    public function upsert(WrappedKeyDTO $dto): VaultCredentialKey
    {
        return VaultCredentialKey::query()->updateOrCreate(
            ['webauthn_credential_id' => $dto->getCredentialId()],
            [
                'wrapped_vmk' => $dto->getWrappedVmk(),
                'wrap_iv' => $dto->getWrapIv(),
                'scheme' => $dto->getScheme(),
            ],
        );
    }
}
