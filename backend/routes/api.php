<?php

declare(strict_types=1);

use App\Http\Controllers\Api\Auth\LoginController;
use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Api\DashboardController;
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
| These run in the `webauthn` middleware group (session-backed) because the
| WebAuthn challenge is stored in the session between the options and verify
| steps. Everything else in the API stays stateless (Bearer token).
*/
Route::prefix('auth')->middleware('webauthn')->group(function (): void {
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
});
