<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * VMK wrapped under a high-entropy recovery key (fallback when PRF is
     * unavailable or all devices are lost). The server stores only the wrapped
     * blob and the KDF salt — never the recovery key itself.
     *
     * @return void
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->text('recovery_wrapped_vmk')->nullable()->after('prf_salt');
            $table->string('recovery_wrap_iv')->nullable()->after('recovery_wrapped_vmk');
            $table->string('recovery_salt')->nullable()->after('recovery_wrap_iv');
        });
    }

    /**
     * @return void
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['recovery_wrapped_vmk', 'recovery_wrap_iv', 'recovery_salt']);
        });
    }
};
