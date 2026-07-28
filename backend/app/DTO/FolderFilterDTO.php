<?php

declare(strict_types=1);

namespace App\DTO;

final class FolderFilterDTO extends BaseDTO
{
    /**
     * @param  string|null  $search  Case-insensitive name search term.
     */
    public function __construct(
        protected ?string $search,
    ) {}

    /**
     * Build the DTO from validated query input.
     *
     * @param  array{search?: string|null}  $validated
     * @return self
     */
    public static function fromArray(array $validated): self
    {
        return new self(
            search: $validated['search'] ?? null,
        );
    }

    /**
     * Get the name search term.
     *
     * @return string|null
     */
    public function getSearch(): ?string
    {
        return $this->search;
    }

    /**
     * Set the name search term.
     *
     * @param  string|null  $search
     * @return void
     */
    public function setSearch(?string $search): void
    {
        $this->search = $search;
    }
}
