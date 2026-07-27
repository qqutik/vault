<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\DTO\RegisterUserData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterOptionsRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Auth\PasskeyRegistrationService;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Laragear\WebAuthn\Http\Requests\AttestedRequest;

class RegisterController extends Controller
{
    public function __construct(
        private readonly PasskeyRegistrationService $registration,
    ) {}

    /**
     * Step 1 — create the pending user and return passkey (attestation) options.
     */
    public function options(RegisterOptionsRequest $request): Responsable
    {
        $result = $this->registration->createOptions(
            RegisterUserData::fromArray($request->validated()),
        );

        $request->session()->put('webauthn.register_user_id', $result->user->getKey());

        return $result->options;
    }

    /**
     * Step 2 — store the attested passkey, sign the user in (session), and
     * return the one-time recovery codes.
     *
     * The pending user is set on the guard by the `webauthn.pending` middleware.
     */
    public function verify(AttestedRequest $request): JsonResponse
    {
        $request->save();

        /** @var User $user */
        $user = $request->user();

        $recoveryCodes = $this->registration->complete($user);

        Auth::guard('web')->login($user);
        $request->session()->regenerate();
        $request->session()->forget('webauthn.register_user_id');

        return response()->json([
            'user' => new UserResource($user),
            'recovery_codes' => $recoveryCodes,
        ], 201);
    }
}
