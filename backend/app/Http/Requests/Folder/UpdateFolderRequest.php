<?php

declare(strict_types=1);

namespace App\Http\Requests\Folder;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFolderRequest extends FormRequest
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

        $parentId = $this->input('parent_id') !== null ? (int) $this->input('parent_id') : null;

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('folders', 'name')
                    ->where('user_id', $user->id)
                    ->where('parent_id', $parentId)
                    ->ignore($this->route('folder')),
            ],
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists('folders', 'id')->where('user_id', $user->id),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.unique' => __('A folder with this name already exists here.'),
        ];
    }
}
