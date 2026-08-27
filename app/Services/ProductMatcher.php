<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Collection;

class ProductMatcher
{
    public static function calculateProductSimilarity(string $query, Product $product): float
    {
        $normalizedQuery = ProductNormalizer::normalizeProductName($query);
        $productName = $product->normalized_name ?: ProductNormalizer::normalizeProductName($product->name);

        $queryTokens = array_unique(ProductNormalizer::tokenizeProductName($query));
        $productTokens = array_unique(ProductNormalizer::tokenizeProductName($productName));

        $intersection = count(array_intersect($queryTokens, $productTokens));
        $union = count(array_unique(array_merge($queryTokens, $productTokens))) ?: 1;
        $textScore = $intersection / $union;
        $anchorScore = count($queryTokens) > 0 ? $intersection / count($queryTokens) : 0;

        $queryPack = ProductNormalizer::extractPackaging($query);
        $queryComparable = ProductNormalizer::toComparableAmount($queryPack['quantity'], $queryPack['unit']);
        $productComparable = ProductNormalizer::toComparableAmount($product->quantity, $product->unit);

        $packagingScore = 0.2;
        $incompatiblePackaging = false;

        if (! $queryComparable || ! $productComparable) {
            $packagingScore = 0.4;
        } elseif ($queryComparable['unit'] === $productComparable['unit']) {
            $delta = abs($queryComparable['amount'] - $productComparable['amount']);
            $relativeDelta = $queryComparable['amount'] > 0 ? $delta / $queryComparable['amount'] : 1;

            if ($delta === 0.0) {
                $packagingScore = 1;
            } elseif ($relativeDelta <= 0.05) {
                $packagingScore = 0.9;
            } elseif ($relativeDelta <= 0.15) {
                $packagingScore = 0.65;
            } else {
                $packagingScore = 0;
                $incompatiblePackaging = true;
            }
        } else {
            $packagingScore = 0;
            $incompatiblePackaging = true;
        }

        $queryCategory = ProductNormalizer::classifyProduct($query);
        $productCategory = ProductNormalizer::classifyProduct($product->name);
        $categoryConflict = $queryCategory && $productCategory && $queryCategory !== $productCategory;
        $categoryScore = (! $queryCategory || ! $productCategory) ? 0.5 : ($queryCategory === $productCategory ? 1 : 0);
        $categoryAligned = $queryCategory && $productCategory && $queryCategory === $productCategory;

        $queryBrand = ProductNormalizer::inferBrand($query);
        $productBrand = $product->brand ? ProductNormalizer::normalizeProductName($product->brand) : null;
        $brandConflict = $queryBrand && $productBrand && $queryBrand !== $productBrand;
        $brandScore = (! $queryBrand || ! $productBrand) ? 0.5 : ($queryBrand === $productBrand ? 1 : 0);

        if ($categoryConflict || $brandConflict) {
            return 0.0;
        }

        if (count($queryTokens) > 0 && $anchorScore < 0.25 && ! $categoryAligned) {
            return 0.0;
        }

        if ($incompatiblePackaging && $anchorScore < 0.75) {
            return 0.0;
        }

        $score = $textScore * 0.3
            + $anchorScore * 0.3
            + $packagingScore * 0.25
            + $brandScore * 0.05
            + $categoryScore * 0.1;

        return round($score, 4);
    }

    /**
     * @param  Collection<int, Product>  $products
     * @return array{product: Product, score: float}|null
     */
    public static function findBestMatch(string $query, Collection $products, float $threshold = 0.44): ?array
    {
        $ranked = $products
            ->map(fn (Product $product) => [
                'product' => $product,
                'score' => self::calculateProductSimilarity($query, $product),
            ])
            ->sortByDesc('score')
            ->values();

        $best = $ranked->first();
        if (! $best || $best['score'] < $threshold) {
            return null;
        }

        $second = $ranked->get(1);
        if ($second && ($best['score'] - $second['score']) < 0.03 && $second['score'] > $threshold) {
            return null;
        }

        return $best;
    }
}
