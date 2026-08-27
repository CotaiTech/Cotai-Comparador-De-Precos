<?php

namespace App\Services;

class ProductNormalizer
{
    private const UNIT_MAP = [
        'litros' => 'l', 'litro' => 'l', 'lt' => 'l', 'lts' => 'l',
        'ml' => 'ml', 'mililitros' => 'ml', 'mililitro' => 'ml',
        'quilos' => 'kg', 'quilo' => 'kg', 'kilo' => 'kg', 'kilos' => 'kg', 'kg' => 'kg',
        'gramas' => 'g', 'grama' => 'g', 'gr' => 'g', 'g' => 'g',
        'unidades' => 'un', 'unidade' => 'un', 'und' => 'un', 'unid' => 'un',
    ];

    private const STOPWORDS = [
        'de', 'da', 'do', 'das', 'dos', 'com', 'sem', 'tipo', 'tradicional',
        'integral', 'parboilizado', 'parbolilizado', 'premium', 'extra',
        'virgem', 'leve', 'pague', 'frasco', 'pote', 'pacote', 'caixa',
        'garrafa', 'tp', 'pet', 'un', 'kg', 'g', 'ml', 'l',
    ];

    private const BRANDS = [
        'vicosa', 'coca cola', 'camil', 'kicaldo', 'soya', 'itambe', 'pilao',
        'dona benta', 'renata', 'sadia', 'ype', 'omo', 'heinz', 'vigor',
        'aurora', 'minalba', 'pif paf', 'perdigao', 'bauducco', 'ducoco',
        'suinco', 'spaten', 'itaipava', 'chamyto', 'vitaliv', 'caboclo',
        'porto alegre', 'nestle', 'batavo', 'vilma', 'liza', 'heineken', 'sprite',
    ];

    private const CATEGORIES = [
        'papel-toalha' => ['papel toalha', 'toalha'],
        'papel-higienico' => ['papel higienico', 'higienico'],
        'arroz' => ['arroz'],
        'feijao' => ['feijao'],
        'oleo' => ['oleo', 'azeite'],
        'leite' => ['leite'],
        'manteiga' => ['manteiga', 'margarina'],
        'queijo' => ['queijo', 'mussarela', 'mucarela', 'requeijao'],
        'presunto' => ['presunto', 'mortadela'],
        'pao' => ['pao'],
        'refrigerante' => ['refrigerante', 'coca cola', 'guarana', 'fanta', 'sprite'],
        'suco' => ['suco'],
        'agua' => ['agua'],
        'carne' => ['patinho', 'alcatra', 'musculo', 'carne', 'bovino'],
        'frango' => ['frango', 'peito', 'coxa', 'sobrecoxa', 'asa'],
        'linguica' => ['linguica', 'calabresa', 'toscana'],
        'tomate' => ['tomate'],
        'batata' => ['batata'],
        'cebola' => ['cebola'],
        'alface' => ['alface'],
        'detergente' => ['detergente'],
        'sabao' => ['sabao', 'lava', 'roupas', 'omo'],
    ];

    private const ACCENTS = [
        'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a',
        'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
        'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i',
        'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
        'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u',
        'ç' => 'c', 'ñ' => 'n',
    ];

    public static function normalizeProductName(string $value): string
    {
        $value = mb_strtolower($value);
        $value = strtr($value, self::ACCENTS);
        $value = preg_replace('/(\d)[.,](\d)/', '$1__DECIMAL__$2', $value);
        $value = preg_replace('/(\d)[ ]?(kg|g|ml|l|lt|lts|litro|litros|un|und|unidade|unidades)\b/', '$1 $2', $value);
        $value = preg_replace('/[^\w\s]/u', ' ', $value);
        $value = str_replace('__DECIMAL__', ',', $value);

        $tokens = array_values(array_filter(preg_split('/\s+/', $value)));
        $tokens = array_map(fn ($token) => self::UNIT_MAP[$token] ?? $token, $tokens);

        return trim(implode(' ', $tokens));
    }

    public static function extractPackaging(string $text): array
    {
        $normalized = self::normalizeProductName($text);

        if (! preg_match('/(\d+(?:[.,]\d+)?)\s?(kg|g|ml|l|un)\b/', $normalized, $match)) {
            return ['quantity' => null, 'unit' => null, 'packageText' => null];
        }

        $quantity = (float) str_replace(',', '.', $match[1]);
        $unit = $match[2];

        return [
            'quantity' => $quantity,
            'unit' => $unit,
            'packageText' => str_replace('.', ',', $match[1]).$unit,
        ];
    }

    public static function inferBrand(string $text): ?string
    {
        $normalized = self::normalizeProductName($text);

        foreach (self::BRANDS as $brand) {
            $normalizedBrand = self::normalizeProductName($brand);
            if (preg_match('/(^|\s)'.preg_quote($normalizedBrand, '/').'(\s|$)/', $normalized)) {
                return $normalizedBrand;
            }
        }

        return null;
    }

    public static function tokenizeProductName(string $text): array
    {
        $tokens = explode(' ', self::normalizeProductName($text));

        return array_values(array_filter($tokens, function ($token) {
            if ($token === '') {
                return false;
            }
            if (in_array($token, self::STOPWORDS, true)) {
                return false;
            }
            if (preg_match('/^\d+(?:,\d+)?$/', $token)) {
                return false;
            }

            return true;
        }));
    }

    public static function classifyProduct(string $text): ?string
    {
        $normalized = self::normalizeProductName($text);

        foreach (self::CATEGORIES as $key => $terms) {
            foreach ($terms as $term) {
                if (str_contains($normalized, self::normalizeProductName($term))) {
                    return $key;
                }
            }
        }

        return null;
    }

    public static function toComparableAmount(?float $quantity, ?string $unit): ?array
    {
        if (! $quantity || ! $unit) {
            return null;
        }

        if (in_array($unit, ['kg', 'l', 'un'], true)) {
            return ['amount' => $quantity, 'unit' => $unit];
        }

        if ($unit === 'g') {
            return ['amount' => $quantity / 1000, 'unit' => 'kg'];
        }

        return ['amount' => $quantity / 1000, 'unit' => 'l'];
    }
}
