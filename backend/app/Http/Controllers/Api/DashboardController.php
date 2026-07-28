<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DashboardResource;
use App\Models\User;
use App\Services\DashboardService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * @param  DashboardService  $dashboard
     */
    public function __construct(
        private readonly DashboardService $dashboard,
    ) {}

    /**
     * Return the current user's dashboard summary.
     *
     * @param  Request  $request
     * @return DashboardResource
     */
    public function index(Request $request): DashboardResource
    {
        /** @var User $user */
        $user = $request->user();

        return new DashboardResource($this->dashboard->forUser($user));
    }
}
