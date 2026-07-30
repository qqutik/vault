<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * The Vault Master Key (VMK) wrapped for a single passkey. The server stores
 * only the wrapped (encrypted) key and never the VMK in plaintext.
 *
 * @property int $id
 * @property string $webauthn_credential_id
 * @property string $wrapped_vmk
 * @property string $wrap_iv
 * @property string $scheme
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['webauthn_credential_id', 'wrapped_vmk', 'wrap_iv', 'scheme'])]
class VaultCredentialKey extends Model
{
    //
}
