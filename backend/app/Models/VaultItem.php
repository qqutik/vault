<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\VaultItemType;
use Database\Factories\VaultItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int|null $folder_id
 * @property VaultItemType $type
 * @property string $title
 * @property array<string, mixed> $data
 * @property bool $favorite
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['folder_id', 'type', 'title', 'data', 'favorite'])]
class VaultItem extends Model
{
    /** @use HasFactory<VaultItemFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => VaultItemType::class,
            'data' => 'encrypted:array', // 🔒 AES-256-GCM at rest via APP_KEY
            'favorite' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Folder, $this>
     */
    public function folder(): BelongsTo
    {
        return $this->belongsTo(Folder::class);
    }
}
