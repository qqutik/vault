<?php

declare(strict_types=1);

namespace App\DTO;

final class FolderDTO extends BaseDTO
{
    /**
     * @param  string  $name  Folder name.
     * @param  int|null  $parentId  Parent folder id, or null for a root folder.
     */
    public function __construct(
        protected string $name,
        protected ?int $parentId,
    ) {}

    /**
     * Build the DTO from validated request input.
     *
     * @param  array{name: string, parent_id?: int|null}  $validated
     * @return self
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
     *
     * @return string
     */
    public function getName(): string
    {
        return $this->name;
    }

    /**
     * Set the folder name.
     *
     * @param  string  $name
     * @return void
     */
    public function setName(string $name): void
    {
        $this->name = $name;
    }

    /**
     * Get the parent folder id, or null for a root folder.
     *
     * @return int|null
     */
    public function getParentId(): ?int
    {
        return $this->parentId;
    }

    /**
     * Set the parent folder id (null for a root folder).
     *
     * @param  int|null  $parentId
     * @return void
     */
    public function setParentId(?int $parentId): void
    {
        $this->parentId = $parentId;
    }
}
