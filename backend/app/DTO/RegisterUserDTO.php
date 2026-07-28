<?php

declare(strict_types=1);

namespace App\DTO;

final class RegisterUserDTO extends BaseDTO
{
    /**
     * @param  string  $name  User display name.
     * @param  string  $email  User e-mail address.
     */
    public function __construct(
        protected string $name,
        protected string $email,
    ) {}

    /**
     * Build the DTO from validated request input.
     *
     * @param  array{name: string, email: string}  $validated
     * @return self
     */
    public static function fromArray(array $validated): self
    {
        return new self(
            name: $validated['name'],
            email: $validated['email'],
        );
    }

    /**
     * Get the user's display name.
     *
     * @return string
     */
    public function getName(): string
    {
        return $this->name;
    }

    /**
     * Set the user's display name.
     *
     * @param  string  $name
     * @return void
     */
    public function setName(string $name): void
    {
        $this->name = $name;
    }

    /**
     * Get the user's e-mail address.
     *
     * @return string
     */
    public function getEmail(): string
    {
        return $this->email;
    }

    /**
     * Set the user's e-mail address.
     *
     * @param  string  $email
     * @return void
     */
    public function setEmail(string $email): void
    {
        $this->email = $email;
    }
}
