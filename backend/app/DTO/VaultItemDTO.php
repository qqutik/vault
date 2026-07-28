<?php

declare(strict_types=1);

namespace App\DTO;

use App\Enums\VaultItemType;

final class VaultItemDTO extends BaseDTO
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __construct(
        protected ?int $folderId,
        protected VaultItemType $type,
        protected string $title,
        protected array $data,
        protected bool $favorite,
    ) {}

    /**
     * Build the DTO from validated request input.
     *
     * @param  array{folder_id?: int|null, type: string, title: string, data: array<string, mixed>, favorite?: bool}  $validated
     */
    public static function fromArray(array $validated): self
    {
        return new self(
            folderId: $validated['folder_id'] ?? null,
            type: VaultItemType::from($validated['type']),
            title: $validated['title'],
            data: $validated['data'],
            favorite: $validated['favorite'] ?? false,
        );
    }

    /**
     * Get the parent folder id, or null when unfiled.
     */
    public function getFolderId(): ?int
    {
        return $this->folderId;
    }

    /**
     * Set the parent folder id (null when unfiled).
     */
    public function setFolderId(?int $folderId): void
    {
        $this->folderId = $folderId;
    }

    /**
     * Get the item type.
     */
    public function getType(): VaultItemType
    {
        return $this->type;
    }

    /**
     * Set the item type.
     */
    public function setType(VaultItemType $type): void
    {
        $this->type = $type;
    }

    /**
     * Get the item title (plaintext, used for listing).
     */
    public function getTitle(): string
    {
        return $this->title;
    }

    /**
     * Set the item title.
     */
    public function setTitle(string $title): void
    {
        $this->title = $title;
    }

    /**
     * Get the secret payload (stored encrypted at rest).
     *
     * @return array<string, mixed>
     */
    public function getData(): array
    {
        return $this->data;
    }

    /**
     * Set the secret payload.
     *
     * @param  array<string, mixed>  $data
     */
    public function setData(array $data): void
    {
        $this->data = $data;
    }

    /**
     * Whether the item is marked as a favorite.
     */
    public function getFavorite(): bool
    {
        return $this->favorite;
    }

    /**
     * Set the favorite flag.
     */
    public function setFavorite(bool $favorite): void
    {
        $this->favorite = $favorite;
    }
}
