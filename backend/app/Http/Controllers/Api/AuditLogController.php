<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\User;
use App\Repositories\AuditLogRepository;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AuditLogController extends Controller
{
    /**
     * @param  AuditLogRepository  $auditLogs
     */
    public function __construct(
        private readonly AuditLogRepository $auditLogs,
    ) {}

    /**
     * List the current user's recent activity (paginated, 5 per page).
     *
     * @param  Request  $request
     * @return AnonymousResourceCollection
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        return AuditLogResource::collection($this->auditLogs->paginateForUser($user));
    }
}
