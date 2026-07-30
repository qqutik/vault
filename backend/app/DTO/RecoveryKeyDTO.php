<?php

declare(strict_types=1);

namespace App\DTO;

final class RecoveryKeyDTO extends BaseDTO
{
    /**
     * @param  string  $wrappedVmk  AES-GCM(recovery KEK, VMK), base64.
     * @param  string  $wrapIv  AES-GCM IV, base64.
     * @param  string  $salt  HKDF salt for the recovery key, base64.
     */
    public function __construct(
        protected string $wrappedVmk,
        protected string $wrapIv,
        protected string $salt,
    ) {}

    /**
     * Build the DTO from validated request input.
     *
     * @param  array{wrapped_vmk: string, wrap_iv: string, salt: string}  $validated
     * @return self
     */
    public static function fromArray(array $validated): self
    {
        return new self(
            wrappedVmk: $validated['wrapped_vmk'],
            wrapIv: $validated['wrap_iv'],
            salt: $validated['salt'],
        );
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
     * Get the recovery HKDF salt (base64).
     *
     * @return string
     */
    public function getSalt(): string
    {
        return $this->salt;
    }

    /**
     * Set the recovery HKDF salt (base64).
     *
     * @param  string  $salt
     * @return void
     */
    public function setSalt(string $salt): void
    {
        $this->salt = $salt;
    }
}
