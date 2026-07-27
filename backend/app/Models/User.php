<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laragear\WebAuthn\Contracts\WebAuthnAuthenticatable;
use Laragear\WebAuthn\WebAuthnAuthentication;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email'])]
#[Hidden(['remember_token'])]
class User extends Authenticatable implements WebAuthnAuthenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, WebAuthnAuthentication;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<Folder, $this>
     */
    public function folders(): HasMany
    {
        return $this->hasMany(Folder::class);
    }

    /**
     * @return HasMany<VaultItem, $this>
     */
    public function vaultItems(): HasMany
    {
        return $this->hasMany(VaultItem::class);
    }

    /**
     * @return HasMany<RecoveryCode, $this>
     */
    public function recoveryCodes(): HasMany
    {
        return $this->hasMany(RecoveryCode::class);
    }
}
