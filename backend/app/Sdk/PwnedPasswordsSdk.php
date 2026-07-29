<?php

declare(strict_types=1);

namespace App\Sdk;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;

/**
 * Client for the Have I Been Pwned "Pwned Passwords" range API.
 *
 * Only a 5-character SHA-1 prefix is ever sent (k-anonymity); the API needs no
 * key. See https://haveibeenpwned.com/API/v3#PwnedPasswords.
 */
class PwnedPasswordsSdk extends BaseSdk
{
    public function __construct()
    {
        parent::__construct((string) config('services.pwned_passwords.base_url'));
    }

    /**
     * Fetch the breach range for a SHA-1 prefix.
     *
     * @param  string  $prefix  5-char (uppercase) hex SHA-1 prefix.
     * @return string Raw body: newline-separated "SUFFIX:COUNT" lines.
     *
     * @throws ConnectionException|RequestException
     */
    public function range(string $prefix): string
    {
        return $this->send('GET', "range/{$prefix}")->body();
    }
}
