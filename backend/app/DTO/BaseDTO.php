<?php

declare(strict_types=1);

namespace App\DTO;

use Illuminate\Support\Str;

/**
 * Base class for all Data Transfer Objects.
 *
 * Guarantees every DTO exposes a toArray() field map. Properties must be
 * `protected` so this base can read them; keys are converted to snake_case.
 */
abstract class BaseDTO
{
    /**
     * Map the DTO's properties to an array, keyed in snake_case.
     *
     * Values are read through each field's getter (getX()), which every DTO is
     * required to provide.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $result = [];

        foreach (array_keys(get_object_vars($this)) as $property) {
            $getter = 'get'.ucfirst($property);
            $result[Str::snake($property)] = $this->{$getter}();
        }

        return $result;
    }
}
