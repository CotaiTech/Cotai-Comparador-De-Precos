<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'id', 'store', 'external_id', 'name', 'normalized_name', 'brand',
    'quantity', 'unit', 'package_text', 'price', 'original_price',
    'discount_percentage', 'promotion', 'available', 'image_url',
    'product_url', 'source',
])]
class Product extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'price' => 'float',
            'original_price' => 'float',
            'discount_percentage' => 'integer',
            'promotion' => 'boolean',
            'available' => 'boolean',
        ];
    }
}
