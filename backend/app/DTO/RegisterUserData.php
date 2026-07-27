<?php

declare(strict_types=1);

namespace App\DTO;

final readonly class RegisterUserData
{
    public function __construct(
        public string $name,
        public string $email,
    ) {}

    /**
     * @param  array{name: string, email: string}  $validated
     */
    public static function fromArray(array $validated): self
    {
        return new self(
            name: $validated['name'],
            email: $validated['email'],
        );
    }
}
