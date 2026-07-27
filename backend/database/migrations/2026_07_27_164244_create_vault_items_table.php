<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('vault_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('folder_id')->nullable()->constrained('folders')->nullOnDelete();
            $table->string('type')->index();           // login | secure_note | card | identity | custom
            $table->string('title');                   // plaintext — for listing/search
            $table->text('data');                      // 🔒 encrypted:array — arbitrary secret fields
            $table->boolean('favorite')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'folder_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vault_items');
    }
};
