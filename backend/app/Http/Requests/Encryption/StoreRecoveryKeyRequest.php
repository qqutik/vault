<?php

declare(strict_types=1);

namespace App\Http\Requests\Encryption;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreRecoveryKeyRequest extends FormRequest
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
            'wrapped_vmk' => ['required', 'string', 'max:1024'],
            'wrap_iv' => ['required', 'string', 'max:128'],
            'salt' => ['required', 'string', 'max:128'],
        ];
    }
}
