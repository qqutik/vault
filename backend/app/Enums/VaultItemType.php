<?php

declare(strict_types=1);

namespace App\Enums;

enum VaultItemType: string
{
    case Login = 'login';
    case SecureNote = 'secure_note';
    case Card = 'card';
    case Identity = 'identity';
    case Custom = 'custom';
}
