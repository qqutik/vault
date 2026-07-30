<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Stores the Vault Master Key (VMK) wrapped for each passkey. The server
     * only ever holds the wrapped (encrypted) VMK — never the VMK itself.
     *
     * @return void
     */
    public function up(): void
    {
        Schema::create('vault_credential_keys', function (Blueprint $table): void {
            $table->id();
            $table->string('webauthn_credential_id', 510);
            $table->text('wrapped_vmk');   // AES-GCM(KEK, VMK), base64
            $table->string('wrap_iv');     // AES-GCM IV, base64
            $table->string('scheme')->default('prf-v1');
            $table->timestamps();

            $table->unique('webauthn_credential_id');
            $table->foreign('webauthn_credential_id')
                ->references('id')->on('webauthn_credentials')
                ->cascadeOnDelete();
        });
    }

    /**
     * @return void
     */
    public function down(): void
    {
        Schema::dropIfExists('vault_credential_keys');
    }
};
