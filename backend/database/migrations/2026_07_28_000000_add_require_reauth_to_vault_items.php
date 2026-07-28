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
        Schema::table('vault_items', function (Blueprint $table): void {
            // When true, viewing this item requires a fresh passkey assertion.
            $table->boolean('require_reauth')->default(false)->after('favorite');
        });
    }

    /**
     * @return void
     */
    public function down(): void
    {
        Schema::table('vault_items', function (Blueprint $table): void {
            $table->dropColumn('require_reauth');
        });
    }
};
