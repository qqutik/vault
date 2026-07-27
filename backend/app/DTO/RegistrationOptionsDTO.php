<?php

declare(strict_types=1);

namespace App\DTO;

use App\Models\User;
use Illuminate\Contracts\Support\Responsable;

final class RegistrationOptionsDTO extends BaseDTO
{
    public function __construct(
        protected User $user,
        protected Responsable $options,
    ) {}

    /**
     * Get the pending user the passkey is being created for.
     */
    public function getUser(): User
    {
        return $this->user;
    }

    /**
     * Set the pending user the passkey is being created for.
     */
    public function setUser(User $user): void
    {
        $this->user = $user;
    }

    /**
     * Get the attestation options response for the client.
     */
    public function getOptions(): Responsable
    {
        return $this->options;
    }

    /**
     * Set the attestation options response for the client.
     */
    public function setOptions(Responsable $options): void
    {
        $this->options = $options;
    }
}
