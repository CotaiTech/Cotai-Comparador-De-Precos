<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('store')->index();
            $table->string('external_id')->nullable();
            $table->string('name');
            $table->string('normalized_name')->index();
            $table->string('brand')->nullable();
            $table->decimal('quantity', 10, 3)->nullable();
            $table->string('unit', 2)->nullable();
            $table->string('package_text')->nullable();
            $table->decimal('price', 10, 2);
            $table->decimal('original_price', 10, 2)->nullable();
            $table->unsignedTinyInteger('discount_percentage')->nullable();
            $table->boolean('promotion')->default(false);
            $table->boolean('available')->default(true);
            $table->string('image_url')->nullable();
            $table->string('product_url')->nullable();
            $table->string('source', 8);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
