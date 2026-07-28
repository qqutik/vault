<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\DTO\RegisterUserDTO;
use App\DTO\RegistrationOptionsDTO;
use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Contracts\Container\Container;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Validation\ValidationException;
use Laragear\WebAuthn\Attestation\Creator\AttestationCreation;
use Laragear\WebAuthn\Attestation\Creator\AttestationCreator;
use Laragear\WebAuthn\Enums\ResidentKey;
use Laragear\WebAuthn\Enums\UserVerification;

class PasskeyRegistrationService
{
    /**
     * @param  Container  $container
     * @param  UserRepository  $users
     * @param  RecoveryCodeService  $recoveryCodes
     */
    public function __construct(
        private readonly Container $container,
        private readonly UserRepository $users,
        private readonly RecoveryCodeService $recoveryCodes,
    ) {}

    /**
     * Build the attestation (passkey creation) options for a signup.
     *
     * @param  RegisterUserDTO  $dto
     * @return RegistrationOptionsDTO
     *
     * @throws ValidationException when the e-mail already owns a passkey.
     */
    public function createOptions(RegisterUserDTO $dto): RegistrationOptionsDTO
    {
        $existing = $this->users->findByEmail($dto->getEmail());

        if ($existing !== null && $existing->webAuthnCredentials()->exists()) {
            throw ValidationException::withMessages([
                'email' => __('This e-mail is already registered.'),
            ]);
        }

        $user = $this->users->firstOrCreateForRegistration($dto);

        $creation = new AttestationCreation(
            user: $user,
            residentKey: ResidentKey::Required,        // discoverable credential → usernameless login
            userVerification: UserVerification::Preferred,
        );

        $options = $this->container->make(AttestationCreator::class)
            ->send($creation)
            ->then(static fn (AttestationCreation $creation): Responsable => $creation->json);

        return new RegistrationOptionsDTO($user, $options);
    }

    /**
     * Finalize a registration once the passkey has been stored: issue the
     * one-time recovery codes.
     *
     * @param  User  $user
     * @return list<string>
     */
    public function complete(User $user): array
    {
        return $this->recoveryCodes->generateFor($user);
    }
}
