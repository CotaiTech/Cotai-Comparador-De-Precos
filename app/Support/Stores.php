<?php

namespace App\Support;

class Stores
{
    public const KEYS = ['escola', 'amantino', 'bh', 'bahamas'];

    public const META = [
        'escola' => ['label' => 'Supermercado Escola', 'color' => 'text-emerald-700', 'accent' => 'bg-emerald-50 border-emerald-200'],
        'amantino' => ['label' => 'Amantino', 'color' => 'text-orange-700', 'accent' => 'bg-orange-50 border-orange-200'],
        'bh' => ['label' => 'Supermercados BH', 'color' => 'text-rose-700', 'accent' => 'bg-rose-50 border-rose-200'],
        'bahamas' => ['label' => 'Bahamas', 'color' => 'text-sky-700', 'accent' => 'bg-sky-50 border-sky-200'],
    ];

    public static function label(string $store): string
    {
        return self::META[$store]['label'] ?? $store;
    }
}
