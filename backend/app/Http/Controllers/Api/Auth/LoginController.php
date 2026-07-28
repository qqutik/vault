<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginOptionsRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Audit\AuditLogger;
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
     * @param  AuditLogger  $audit
     */
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Step 1 — return assertion (passkey login) options. Usernameless when no
     * email is supplied.
     *
     * @param  LoginOptionsRequest  $request
     * @param  AssertionRequest  $assertion
     * @return Responsable
     */
    public function options(LoginOptionsRequest $request, AssertionRequest $assertion): Responsable
    {
        $email = $request->validated('email');

        return $assertion->toVerify($email !== null ? ['email' => $email] : []);
    }

    /**
     * Step 2 — verify the assertion and start the session (httpOnly cookie).
     *
     * @param  AssertedRequest  $request
     * @return JsonResponse
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
        $this->audit->log(AuditAction::LoginSuccess, user: $user);

        return response()->json([
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Log the user out and invalidate their session.
     *
     * @param  Request  $request
     * @return JsonResponse
     */
    public function logout(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->audit->log(AuditAction::Logout, user: $user);

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => __('Logged out.')]);
    }
}
