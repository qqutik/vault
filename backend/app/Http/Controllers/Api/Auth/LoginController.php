<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginOptionsRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
     * Step 2 — verify the assertion and start the session (httpOnly cookie).
     *
     * @throws ValidationException
     */
    public function verify(AssertedRequest $request): JsonResponse
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
        ]);
    }

    /**
     * Log the user out and invalidate their session.
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => __('Logged out.')]);
    }
}
