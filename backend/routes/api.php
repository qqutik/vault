<?php

declare(strict_types=1);

use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\Auth\LoginController;
use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FolderController;
use App\Http\Controllers\Api\PasskeyController;
use App\Http\Controllers\Api\PwnedPasswordController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\VaultItemController;
use App\Http\Resources\UserResource;
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
| Passkey (WebAuthn) authentication — passwordless.
|
| Session-backed via Sanctum's stateful API (see bootstrap/app.php): the
| WebAuthn challenge and the resulting login both live in the session, which
| the SPA carries in an httpOnly cookie.
*/
Route::prefix('auth')->group(function (): void {
    Route::post('register/options', [RegisterController::class, 'options']);
    Route::post('register/verify', [RegisterController::class, 'verify'])
        ->middleware('webauthn.pending');

    Route::post('login/options', [LoginController::class, 'options']);
    Route::post('login/verify', [LoginController::class, 'verify']);
});

// Authenticated (Bearer token via Sanctum).
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/me', fn (Request $request) => new UserResource($request->user()));
    Route::post('/auth/logout', [LoginController::class, 'logout']);
    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::apiResource('folders', FolderController::class);

    // Step-up: unlock an item that requires a fresh passkey before revealing it.
    Route::post('vault-items/{vaultItem}/unlock/options', [VaultItemController::class, 'unlockOptions']);
    Route::post('vault-items/{vaultItem}/unlock', [VaultItemController::class, 'unlock']);
    Route::apiResource('vault-items', VaultItemController::class);

    // Passkey (device) management — register additional passkeys and remove them.
    Route::get('/passkeys', [PasskeyController::class, 'index']);
    Route::post('/passkeys/options', [PasskeyController::class, 'options']);
    Route::post('/passkeys/verify', [PasskeyController::class, 'verify']);
    Route::delete('/passkeys', [PasskeyController::class, 'destroy']);

    // Breach-check a password (Have I Been Pwned, k-anonymity — hash prefix only).
    Route::post('/pwned-passwords/check', [PwnedPasswordController::class, 'check']);

    // Active login sessions — list and revoke.
    Route::get('/sessions', [SessionController::class, 'index']);
    Route::post('/sessions/revoke-others', [SessionController::class, 'destroyOthers']);
    Route::delete('/sessions/{id}', [SessionController::class, 'destroy']);

    Route::get('/audit-logs', [AuditLogController::class, 'index']);
});
