<?php

declare(strict_types=1);

namespace App\Enums;

enum AuditAction: string
{
    case Registered = 'auth.registered';
    case LoginSuccess = 'login.success';
    case Logout = 'logout';

    case ItemViewed = 'item.viewed';
    case ItemCreated = 'item.created';
    case ItemUpdated = 'item.updated';
    case ItemDeleted = 'item.deleted';

    case FolderCreated = 'folder.created';
    case FolderUpdated = 'folder.updated';
    case FolderDeleted = 'folder.deleted';
}
