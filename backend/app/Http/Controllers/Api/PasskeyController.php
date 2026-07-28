<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\PasskeyResource;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Auth\PasskeyRegistrationService;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;
use Laragear\WebAuthn\Http\Requests\AttestedRequest;

/**
 * Manage the passkeys (WebAuthn credentials) of the authenticated user.
 *
 * A user may register several passkeys — phone, laptop, security key — so that
 * losing one device does not lock them out; they log in with any of the others.
 */
class PasskeyController extends Controller
{
    /**
     * @param  PasskeyRegistrationService  $registration
     * @param  AuditLogger  $audit
     */
    public function __construct(
        private readonly PasskeyRegistrationService $registration,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * List the current user's registered passkeys.
     *
     * @param  Request  $request
     * @return AnonymousResourceCollection
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        return PasskeyResource::collection(
            $user->webAuthnCredentials()->latest()->get(),
        );
    }

    /**
     * Step 1 — attestation options to add a passkey to the current user.
     *
     * @param  Request  $request
     * @return Responsable
     */
    public function options(Request $request): Responsable
    {
        /** @var User $user */
        $user = $request->user();

        return $this->registration->createOptionsForUser($user);
    }

    /**
     * Step 2 — store the attested passkey (with a friendly device alias).
     *
     * @param  AttestedRequest  $request
     * @return JsonResponse
     */
    public function verify(AttestedRequest $request): JsonResponse
    {
        $alias = $request->input('alias');
        $alias = is_string($alias) ? mb_substr(trim($alias), 0, 100) : null;

        $request->save(['alias' => $alias !== '' ? $alias : null]);

        /** @var User $user */
        $user = $request->user();
        $this->audit->log(AuditAction::PasskeyAdded, user: $user);

        return response()->json([
            'passkeys' => PasskeyResource::collection(
                $user->webAuthnCredentials()->latest()->get(),
            ),
        ], 201);
    }

    /**
     * Remove a passkey. Refuses to delete the last one so the user can never
     * lock themselves out of every device at once.
     *
     * @param  Request  $request
     * @return JsonResponse
     *
     * @throws ValidationException
     */
    public function destroy(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $id = (string) $request->input('id');

        $credential = $user->webAuthnCredentials()->whereKey($id)->first();

        if ($credential === null) {
            throw ValidationException::withMessages([
                'id' => __('Passkey not found.'),
            ]);
        }

        if ($user->webAuthnCredentials()->count() <= 1) {
            throw ValidationException::withMessages([
                'id' => __('This is your last passkey — add another device before removing it.'),
            ]);
        }

        $credential->delete();

        $this->audit->log(AuditAction::PasskeyRemoved, user: $user);

        return response()->json([
            'passkeys' => PasskeyResource::collection(
                $user->webAuthnCredentials()->latest()->get(),
            ),
        ]);
    }
}
