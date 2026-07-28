<?php

declare(strict_types=1);

namespace App\Http\Requests\VaultItem;

use App\Enums\VaultItemType;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateVaultItemRequest extends FormRequest
{
    /**
     * @return bool
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var User $user */
        $user = $this->user();

        return [
            'folder_id' => [
                'nullable',
                'integer',
                Rule::exists('folders', 'id')->where('user_id', $user->id),
            ],
            'type' => ['required', Rule::enum(VaultItemType::class)],
            'title' => ['required', 'string', 'max:255'],
            'data' => ['required', 'array'],
            'favorite' => ['sometimes', 'boolean'],
        ];
    }
}
