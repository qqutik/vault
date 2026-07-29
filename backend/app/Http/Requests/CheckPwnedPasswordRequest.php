<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class CheckPwnedPasswordRequest extends FormRequest
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
        return [
            'prefix' => ['required', 'string', 'regex:/^[A-Fa-f0-9]{5}$/'],
            'suffix' => ['required', 'string', 'regex:/^[A-Fa-f0-9]{35}$/'],
        ];
    }
}
