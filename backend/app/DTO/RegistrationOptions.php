<?php

declare(strict_types=1);

namespace App\DTO;

use App\Models\User;
use Illuminate\Contracts\Support\Responsable;

final readonly class RegistrationOptions
{
    public function __construct(
        public User $user,
        public Responsable $options,
    ) {}
}
