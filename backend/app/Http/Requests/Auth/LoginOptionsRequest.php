<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class LoginOptionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // Email is optional: when omitted the login is usernameless
        // (discoverable credential — the device offers matching passkeys).
        return [
            'email' => ['nullable', 'string', 'email', 'max:255'],
        ];
    }
}
