<?php

declare(strict_types=1);

namespace App\DTO;

final class FolderDTO extends BaseDTO
{
    public function __construct(
        protected string $name,
        protected ?int $parentId,
    ) {}

    /**
     * Build the DTO from validated request input.
     *
     * @param  array{name: string, parent_id?: int|null}  $validated
     */
    public static function fromArray(array $validated): self
    {
        return new self(
            name: $validated['name'],
            parentId: $validated['parent_id'] ?? null,
        );
    }

    /**
     * Get the folder name.
     */
    public function getName(): string
    {
        return $this->name;
    }

    /**
     * Set the folder name.
     */
    public function setName(string $name): void
    {
        $this->name = $name;
    }

    /**
     * Get the parent folder id, or null for a root folder.
     */
    public function getParentId(): ?int
    {
        return $this->parentId;
    }

    /**
     * Set the parent folder id (null for a root folder).
     */
    public function setParentId(?int $parentId): void
    {
        $this->parentId = $parentId;
    }
}
