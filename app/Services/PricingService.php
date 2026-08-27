<?php

namespace App\Services;

use App\Models\Product;

class PricingService
{
    public static function getUnitPrice(Product $product): ?array
    {
        if (! $product->quantity || ! $product->unit) {
            return null;
        }

        if (in_array($product->unit, ['kg', 'l'], true)) {
            return ['value' => $product->price / $product->quantity, 'unit' => $product->unit];
        }

        if ($product->unit === 'g') {
            return ['value' => $product->price / ($product->quantity / 1000), 'unit' => 'kg'];
        }

        if ($product->unit === 'ml') {
            return ['value' => $product->price / ($product->quantity / 1000), 'unit' => 'l'];
        }

        return ['value' => $product->price / $product->quantity, 'unit' => 'un'];
    }

    public static function getProductSubtotal(float $price, int $quantity): float
    {
        return round($price * $quantity, 2);
    }
}
