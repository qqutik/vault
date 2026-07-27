<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates the request as the user that started a passkey registration.
 *
 * The registration `options` step stores the pending user id in the session;
 * the `verify` step needs that user set on the guard so laragear can attach the
 * freshly created credential to them. If there is no pending user, the request
 * stays unauthenticated and AttestedRequest rejects it (403).
 */
class SetPendingWebAuthnUser
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $userId = $request->session()->get('webauthn.register_user_id');

        if ($userId !== null) {
            $user = User::query()->find($userId);

            if ($user !== null) {
                Auth::setUser($user);
            }
        }

        return $next($request);
    }
}
