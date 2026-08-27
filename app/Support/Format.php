<?php

namespace App\Support;

class Format
{
    public static function currency(?float $value): string
    {
        if ($value === null) {
            return '—';
        }

        return 'R$ '.number_format($value, 2, ',', '.');
    }

    public static function dateLabel(string $updatedAt, string $source): string
    {
        if ($source === 'mock') {
            return 'Preço demonstrativo';
        }

        return 'Preço consultado em '.\Illuminate\Support\Carbon::parse($updatedAt)->format('d/m \à\s H:i');
    }
}
