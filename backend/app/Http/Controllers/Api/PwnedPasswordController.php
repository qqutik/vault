<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckPwnedPasswordRequest;
use App\Services\PwnedPasswordService;
use Illuminate\Http\JsonResponse;

/**
 * Breach-check a password against Have I Been Pwned via k-anonymity. The client
 * hashes the password locally and sends only its SHA-1 prefix/suffix; the plain
 * password never reaches the server, and only the prefix is forwarded to HIBP.
 */
class PwnedPasswordController extends Controller
{
    /**
     * @param  PwnedPasswordService  $pwned
     */
    public function __construct(
        private readonly PwnedPasswordService $pwned,
    ) {}

    /**
     * Return how many known breaches contain the given password hash.
     *
     * @param  CheckPwnedPasswordRequest  $request
     * @return JsonResponse
     */
    public function check(CheckPwnedPasswordRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $count = $this->pwned->breachCount($validated['prefix'], $validated['suffix']);

        return response()->json(['count' => $count]);
    }
}
