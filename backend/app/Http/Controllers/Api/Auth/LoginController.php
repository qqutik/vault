<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginOptionsRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Auth\AccessTokenService;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laragear\WebAuthn\Http\Requests\AssertedRequest;
use Laragear\WebAuthn\Http\Requests\AssertionRequest;

class LoginController extends Controller
{
    /**
     * Step 1 — return assertion (passkey login) options. Usernameless when no
     * email is supplied.
     */
    public function options(LoginOptionsRequest $request, AssertionRequest $assertion): Responsable
    {
        $email = $request->validated('email');

        return $assertion->toVerify($email !== null ? ['email' => $email] : []);
    }

    /**
     * Step 2 — verify the assertion and issue an access token.
     *
     * @throws ValidationException
     */
    public function verify(AssertedRequest $request, AccessTokenService $tokens): JsonResponse
    {
        $user = $request->login();

        if ($user === null) {
            throw ValidationException::withMessages([
                'passkey' => __('Passkey authentication failed.'),
            ]);
        }

        /** @var User $user */
        return response()->json([
            'user' => new UserResource($user),
            'token' => $tokens->issue($user),
        ]);
    }

    /**
     * Revoke the access token used for the current request.
     */
    public function logout(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->currentAccessToken()->delete();

        return response()->json(['message' => __('Logged out.')]);
    }
}
