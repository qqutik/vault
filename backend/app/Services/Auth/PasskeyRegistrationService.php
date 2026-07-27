<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\DTO\RegisterUserData;
use App\DTO\RegistrationOptions;
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
    public function __construct(
        private readonly Container $container,
        private readonly UserRepository $users,
        private readonly RecoveryCodeService $recoveryCodes,
        private readonly AccessTokenService $tokens,
    ) {}

    /**
     * Build the attestation (passkey creation) options for a signup.
     *
     * @throws ValidationException when the e-mail already owns a passkey.
     */
    public function createOptions(RegisterUserData $data): RegistrationOptions
    {
        $existing = $this->users->findByEmail($data->email);

        if ($existing !== null && $existing->webAuthnCredentials()->exists()) {
            throw ValidationException::withMessages([
                'email' => __('This e-mail is already registered.'),
            ]);
        }

        $user = $this->users->firstOrCreateForRegistration($data);

        $creation = new AttestationCreation(
            user: $user,
            residentKey: ResidentKey::Required,        // discoverable credential → usernameless login
            userVerification: UserVerification::Preferred,
        );

        $options = $this->container->make(AttestationCreator::class)
            ->send($creation)
            ->then(static fn (AttestationCreation $creation): Responsable => $creation->json);

        return new RegistrationOptions($user, $options);
    }

    /**
     * Finalize a registration once the passkey has been stored: issue recovery
     * codes and an access token.
     *
     * @return array{token: string, recovery_codes: list<string>}
     */
    public function complete(User $user): array
    {
        return [
            'token' => $this->tokens->issue($user),
            'recovery_codes' => $this->recoveryCodes->generateFor($user),
        ];
    }
}
