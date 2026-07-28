<?php

declare(strict_types=1);

namespace App\DTO;

use App\Enums\VaultItemType;

final class VaultItemFilterDTO extends BaseDTO
{
    /**
     * @param  string|null  $search  Case-insensitive title search term.
     * @param  VaultItemType|null  $type  Filter by item type.
     * @param  int|null  $folderId  Filter by folder id.
     * @param  bool|null  $favorite  Filter by favorite flag.
     */
    public function __construct(
        protected ?string $search,
        protected ?VaultItemType $type,
        protected ?int $folderId,
        protected ?bool $favorite,
    ) {}

    /**
     * Build the DTO from validated query input.
     *
     * @param  array{search?: string|null, type?: string|null, folder_id?: int|null, favorite?: bool|string|null}  $validated
     * @return self
     */
    public static function fromArray(array $validated): self
    {
        $favorite = $validated['favorite'] ?? null;

        return new self(
            search: $validated['search'] ?? null,
            type: isset($validated['type']) ? VaultItemType::from($validated['type']) : null,
            folderId: isset($validated['folder_id']) ? (int) $validated['folder_id'] : null,
            favorite: $favorite === null ? null : filter_var($favorite, FILTER_VALIDATE_BOOLEAN),
        );
    }

    /**
     * Get the title search term.
     *
     * @return string|null
     */
    public function getSearch(): ?string
    {
        return $this->search;
    }

    /**
     * Set the title search term.
     *
     * @param  string|null  $search
     * @return void
     */
    public function setSearch(?string $search): void
    {
        $this->search = $search;
    }

    /**
     * Get the type filter.
     *
     * @return VaultItemType|null
     */
    public function getType(): ?VaultItemType
    {
        return $this->type;
    }

    /**
     * Set the type filter.
     *
     * @param  VaultItemType|null  $type
     * @return void
     */
    public function setType(?VaultItemType $type): void
    {
        $this->type = $type;
    }

    /**
     * Get the folder filter.
     *
     * @return int|null
     */
    public function getFolderId(): ?int
    {
        return $this->folderId;
    }

    /**
     * Set the folder filter.
     *
     * @param  int|null  $folderId
     * @return void
     */
    public function setFolderId(?int $folderId): void
    {
        $this->folderId = $folderId;
    }

    /**
     * Get the favorite filter.
     *
     * @return bool|null
     */
    public function getFavorite(): ?bool
    {
        return $this->favorite;
    }

    /**
     * Set the favorite filter.
     *
     * @param  bool|null  $favorite
     * @return void
     */
    public function setFavorite(?bool $favorite): void
    {
        $this->favorite = $favorite;
    }
}
