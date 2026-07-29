<?php

declare(strict_types=1);

namespace App\Sdk;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Base for all external-API SDKs. Every concrete SDK sets a host (and optional
 * bearer token) and funnels its requests through the single {@see send()} method.
 */
abstract class BaseSdk
{
    /**
     * @param  string  $host  Base URL every request is sent against (required).
     * @param  string|null  $token  Optional bearer token for authenticated APIs.
     */
    public function __construct(
        protected string $host,
        protected ?string $token = null,
    ) {}

    /**
     * Send an HTTP request against the host. Every other SDK method funnels
     * through here.
     *
     * @param  string  $method  HTTP verb (GET, POST, PUT, PATCH, DELETE…).
     * @param  string  $endpoint  Path relative to the host.
     * @param  array<string, mixed>  $params  Query params for GET/HEAD, JSON body otherwise.
     * @return Response
     *
     * @throws ConnectionException|RequestException
     */
    public function send(string $method, string $endpoint, array $params = []): Response
    {
        $method = strtoupper($method);

        $options = in_array($method, ['GET', 'HEAD'], true)
            ? ['query' => $params]
            : ['json' => $params];

        return $this->request()->send($method, $endpoint, $options)->throw();
    }

    /**
     * Build the base pending request (host, timeout, optional bearer token).
     *
     * @return PendingRequest
     */
    protected function request(): PendingRequest
    {
        $request = Http::baseUrl($this->host)->timeout(10);

        if ($this->token !== null) {
            $request = $request->withToken($this->token);
        }

        return $request;
    }

    /**
     * Get the base host URL.
     *
     * @return string
     */
    public function getHost(): string
    {
        return $this->host;
    }

    /**
     * Set the base host URL.
     *
     * @param  string  $host
     * @return void
     */
    public function setHost(string $host): void
    {
        $this->host = $host;
    }

    /**
     * Get the bearer token, or null when the API needs none.
     *
     * @return string|null
     */
    public function getToken(): ?string
    {
        return $this->token;
    }

    /**
     * Set the bearer token (null to send unauthenticated).
     *
     * @param  string|null  $token
     * @return void
     */
    public function setToken(?string $token): void
    {
        $this->token = $token;
    }
}
