<?php

use App\Http\Middleware\SetPendingWebAuthnUser;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sanctum SPA: requests from the stateful frontend get session + CSRF,
        // so auth lives in an httpOnly cookie (no Bearer token in JS). This also
        // backs the passkey ceremony, whose challenge is kept in the session.
        $middleware->statefulApi();

        $middleware->alias([
            'webauthn.pending' => SetPendingWebAuthnUser::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
