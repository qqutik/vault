<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Contracts\Container\Container;
use Illuminate\Http\Request;
use Laragear\WebAuthn\Assertion\Validator\AssertionValidation;
use Laragear\WebAuthn\Assertion\Validator\AssertionValidator;
use Laragear\WebAuthn\JsonTransport;

class PasskeyAssertionService
{
    /**
     * @param  Container  $container
     * @param  Request  $request
     */
    public function __construct(
        private readonly Container $container,
        private readonly Request $request,
    ) {}

    /**
     * Validate the current request's passkey assertion against the given user's
     * challenge and credentials. Does not touch the login state — it is a
     * step-up check. Throws a ValidationException (422) when the assertion is
     * invalid or the credential does not belong to the user.
     *
     * @param  User  $user
     * @return void
     */
    public function verifyForUser(User $user): void
    {
        $validation = new AssertionValidation(
            new JsonTransport($this->request->only(AssertionValidation::REQUEST_KEYS)),
            user: $user,
        );

        $this->container->make(AssertionValidator::class)
            ->send($validation)
            ->thenReturn();
    }
}
