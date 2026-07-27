<?php

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API routes
|--------------------------------------------------------------------------
| Vault is an API-only backend. The React SPA (frontend/) talks to these
| endpoints with a Bearer token issued by Laravel Sanctum.
*/

// Health check.
Route::get('/health', fn (): JsonResponse => response()->json([
    'app' => config('app.name'),
    'status' => 'ok',
]));

/*
| Public — Passkey (WebAuthn) authentication. [Phase 2 — to implement]
|
| Passwordless flow adapted for token-based auth:
|   POST /auth/register/options   → attestation challenge (creates user)
|   POST /auth/register/verify    → store passkey, return recovery codes + token
|   POST /auth/login/options      → assertion challenge
|   POST /auth/login/verify       → verify assertion, return Sanctum token
|   POST /auth/recovery/verify    → recovery-code login → register a new passkey
|
| Ready-made reference controllers live in app/Http/Controllers/WebAuthn
| (laragear stubs). They default to session login and to registering a
| passkey for an already-authenticated user, so they still need adapting to
| passwordless signup + token issuance before wiring up.
*/

// Authenticated (Bearer token via Sanctum).
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', fn (Request $request) => $request->user());

    // Phase 3+ — passkeys management, folders, vault items:
    //   Route::apiResource('folders', FolderController::class);
    //   Route::apiResource('vault-items', VaultItemController::class);
    //   Route::get('passkeys', [PasskeyController::class, 'index']);
});
