<?php

declare(strict_types=1);

namespace App\DTO;

final readonly class FolderData
{
    public function __construct(
        public string $name,
        public ?int $parentId,
    ) {}

    /**
     * @param  array{name: string, parent_id?: int|null}  $validated
     */
    public static function fromArray(array $validated): self
    {
        return new self(
            name: $validated['name'],
            parentId: $validated['parent_id'] ?? null,
        );
    }
}
