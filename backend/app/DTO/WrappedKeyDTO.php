<?php

declare(strict_types=1);

namespace App\DTO;

final class WrappedKeyDTO extends BaseDTO
{
    /**
     * @param  string  $credentialId  Owning passkey (webauthn_credentials.id).
     * @param  string  $wrappedVmk  AES-GCM(KEK, VMK), base64.
     * @param  string  $wrapIv  AES-GCM IV used for wrapping, base64.
     * @param  string  $scheme  Key-derivation scheme identifier.
     */
    public function __construct(
        protected string $credentialId,
        protected string $wrappedVmk,
        protected string $wrapIv,
        protected string $scheme = 'prf-v1',
    ) {}

    /**
     * Build the DTO from validated request input.
     *
     * @param  array{credential_id: string, wrapped_vmk: string, wrap_iv: string, scheme?: string}  $validated
     * @return self
     */
    public static function fromArray(array $validated): self
    {
        return new self(
            credentialId: $validated['credential_id'],
            wrappedVmk: $validated['wrapped_vmk'],
            wrapIv: $validated['wrap_iv'],
            scheme: $validated['scheme'] ?? 'prf-v1',
        );
    }

    /**
     * Get the owning passkey credential id.
     *
     * @return string
     */
    public function getCredentialId(): string
    {
        return $this->credentialId;
    }

    /**
     * Set the owning passkey credential id.
     *
     * @param  string  $credentialId
     * @return void
     */
    public function setCredentialId(string $credentialId): void
    {
        $this->credentialId = $credentialId;
    }

    /**
     * Get the wrapped VMK (base64).
     *
     * @return string
     */
    public function getWrappedVmk(): string
    {
        return $this->wrappedVmk;
    }

    /**
     * Set the wrapped VMK (base64).
     *
     * @param  string  $wrappedVmk
     * @return void
     */
    public function setWrappedVmk(string $wrappedVmk): void
    {
        $this->wrappedVmk = $wrappedVmk;
    }

    /**
     * Get the wrapping IV (base64).
     *
     * @return string
     */
    public function getWrapIv(): string
    {
        return $this->wrapIv;
    }

    /**
     * Set the wrapping IV (base64).
     *
     * @param  string  $wrapIv
     * @return void
     */
    public function setWrapIv(string $wrapIv): void
    {
        $this->wrapIv = $wrapIv;
    }

    /**
     * Get the key-derivation scheme identifier.
     *
     * @return string
     */
    public function getScheme(): string
    {
        return $this->scheme;
    }

    /**
     * Set the key-derivation scheme identifier.
     *
     * @param  string  $scheme
     * @return void
     */
    public function setScheme(string $scheme): void
    {
        $this->scheme = $scheme;
    }
}
