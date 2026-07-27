<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Vault is a token-based API consumed by the React SPA (frontend/).
    | We allow the SPA origin to call the API and the passkey endpoints.
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter([
        env('FRONTEND_URL', 'http://localhost:5173'),
    ]),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // Token-based auth (Bearer) does not need cookies. Flip to true only if
    // you later switch to Sanctum's stateful SPA (cookie) mode.
    'supports_credentials' => false,

];
