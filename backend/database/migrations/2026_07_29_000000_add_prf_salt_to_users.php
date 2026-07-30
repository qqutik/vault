<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * @return void
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            // Per-user PRF salt (base64). Non-secret; kept stable so the passkey
            // PRF output is deterministic. Null until zero-knowledge is set up.
            $table->string('prf_salt')->nullable()->after('email');
        });
    }

    /**
     * @return void
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('prf_salt');
        });
    }
};
