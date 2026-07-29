<?php

declare(strict_types=1);

namespace App\Services;

use App\Sdk\PwnedPasswordsSdk;

class PwnedPasswordService
{
    /**
     * @param  PwnedPasswordsSdk  $sdk
     */
    public function __construct(
        private readonly PwnedPasswordsSdk $sdk,
    ) {}

    /**
     * How many known breaches contain the password whose SHA-1 hash is
     * `prefix.suffix`. Only the prefix reaches HIBP; the suffix is matched
     * locally against the returned range. Returns 0 when not found.
     *
     * @param  string  $prefix  5-char hex SHA-1 prefix.
     * @param  string  $suffix  Remaining 35-char hex SHA-1 suffix.
     * @return int
     */
    public function breachCount(string $prefix, string $suffix)
    {
        $body = $this->sdk->range($prefix);

        foreach (explode("\n", $body) as $line) {
            [$lineSuffix, $count] = array_pad(explode(':', trim($line), 2), 2, '0');

            if (strcasecmp($lineSuffix, $suffix) === 0) {
                return (int) $count;
            }
        }

        return 0;
    }
}
