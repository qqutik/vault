<?php

declare(strict_types=1);

namespace App\Enums;

enum AuditAction: string
{
    case Registered = 'auth.registered';
    case LoginSuccess = 'login.success';
    case Logout = 'logout';

    case PasskeyAdded = 'passkey.added';
    case PasskeyRemoved = 'passkey.removed';

    case ItemViewed = 'item.viewed';
    case ItemUnlocked = 'item.unlocked';
    case ItemCreated = 'item.created';
    case ItemUpdated = 'item.updated';
    case ItemDeleted = 'item.deleted';

    case FolderCreated = 'folder.created';
    case FolderUpdated = 'folder.updated';
    case FolderDeleted = 'folder.deleted';
}
