<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\SessionResource;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\SessionService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * List and revoke the authenticated user's active login sessions.
 */
class SessionController extends Controller
{
    /**
     * @param  SessionService  $sessions
     * @param  AuditLogger  $audit
     */
    public function __construct(
        private readonly SessionService $sessions,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * List the current user's active sessions.
     *
     * @param  Request  $request
     * @return AnonymousResourceCollection
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return $this->collect($request);
    }

    /**
     * Revoke a single session (not the current one) by its opaque handle.
     *
     * @param  Request  $request
     * @param  string  $id  SHA-256 handle of the target session.
     * @return AnonymousResourceCollection
     */
    public function destroy(Request $request, string $id): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        $revoked = $this->sessions->revoke((int) $user->getKey(), $id, $request->session()->getId());

        if ($revoked) {
            $this->audit->log(AuditAction::SessionRevoked, user: $user);
        }

        return $this->collect($request);
    }

    /**
     * Revoke every session except the current one.
     *
     * @param  Request  $request
     * @return AnonymousResourceCollection
     */
    public function destroyOthers(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        $count = $this->sessions->revokeOthers((int) $user->getKey(), $request->session()->getId());

        if ($count > 0) {
            $this->audit->log(AuditAction::SessionRevoked, user: $user);
        }

        return $this->collect($request);
    }

    /**
     * Build the current user's session collection response.
     *
     * @param  Request  $request
     * @return AnonymousResourceCollection
     */
    private function collect(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        return SessionResource::collection(
            $this->sessions->forUser((int) $user->getKey(), $request->session()->getId()),
        );
    }
}
