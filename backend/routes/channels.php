<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function (User $user, int $id) {
    return $user->id === $id;
});

// A user's private activity feed — only the user themselves may subscribe.
Broadcast::channel('user.{id}.activity', function (User $user, int $id) {
    return $user->id === $id;
});
