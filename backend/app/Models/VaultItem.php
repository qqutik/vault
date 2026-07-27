<?php

namespace App\Models;

use App\Enums\VaultItemType;
use Database\Factories\VaultItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VaultItem extends Model
{
    /** @use HasFactory<VaultItemFactory> */
    use HasFactory;

    protected $fillable = [
        'folder_id',
        'type',
        'title',
        'data',
        'favorite',
    ];

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
