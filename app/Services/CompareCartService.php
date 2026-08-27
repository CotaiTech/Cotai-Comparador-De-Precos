<?php

namespace App\Services;

use App\Models\Product;
use App\Support\Stores;
use Illuminate\Support\Collection;

class CompareCartService
{
    /**
     * A sessão de Laravel serializa os dados em JSON, então os modelos
     * Eloquent embutidos no resultado (product) precisam virar arrays
     * simples antes de serem guardados em `session()`.
     */
    public function toSessionArray(array $result): array
    {
        foreach ($result['lines'] as &$line) {
            foreach (Stores::KEYS as $store) {
                $product = $line['stores'][$store]['product'] ?? null;
                $line['stores'][$store]['product'] = $product?->toArray();
            }
        }
        unset($line);

        foreach ($result['optimized']['allocations'] as &$allocation) {
            foreach ($allocation['lines'] as &$allocationLine) {
                $allocationLine['product'] = $allocationLine['product']?->toArray();
            }
            unset($allocationLine);
        }
        unset($allocation);

        return $result;
    }

    /**
     * @param  array<int, array{query: string, quantity: int}>  $items
     * @param  array<string, Collection<int, Product>>  $productsByStore
     */
    public function compareCart(array $items, array $productsByStore): array
    {
        $lines = [];

        foreach ($items as $item) {
            $entries = [];

            foreach (Stores::KEYS as $store) {
                $match = ProductMatcher::findBestMatch($item['query'], $productsByStore[$store] ?? collect());
                $subtotal = $match ? PricingService::getProductSubtotal($match['product']->price, $item['quantity']) : null;

                $entries[$store] = [
                    'product' => $match['product'] ?? null,
                    'subtotal' => $subtotal,
                    'found' => (bool) $match,
                ];
            }

            $bestStore = collect(Stores::KEYS)
                ->filter(fn ($store) => $entries[$store]['subtotal'] !== null)
                ->sortBy(fn ($store) => $entries[$store]['subtotal'])
                ->first();

            $lines[] = [
                'query' => $item['query'],
                'quantity' => $item['quantity'],
                'bestStore' => $bestStore,
                'stores' => $entries,
            ];
        }

        $stores = [];
        foreach (Stores::KEYS as $store) {
            $foundItems = collect($lines)->filter(fn ($line) => $line['stores'][$store]['found'])->count();
            $total = round(collect($lines)->sum(fn ($line) => $line['stores'][$store]['subtotal'] ?? 0), 2);

            $stores[$store] = [
                'store' => $store,
                'total' => $total,
                'foundItems' => $foundItems,
                'requestedItems' => count($items),
                'missingItems' => count($items) - $foundItems,
                'complete' => $foundItems === count($items),
            ];
        }

        $completeStores = collect(Stores::KEYS)
            ->map(fn ($store) => $stores[$store])
            ->filter(fn ($store) => $store['complete'])
            ->sortBy('total')
            ->values();

        $everyStoreComplete = $completeStores->count() === count(Stores::KEYS);
        $winnerStore = $everyStoreComplete ? $completeStores->first() : null;
        $runnerUp = $completeStores->get(1);

        $savings = ($winnerStore && $runnerUp) ? round($runnerUp['total'] - $winnerStore['total'], 2) : 0.0;
        $savingsPercentage = ($winnerStore && $runnerUp && $runnerUp['total'] > 0)
            ? round((($runnerUp['total'] - $winnerStore['total']) / $runnerUp['total']) * 100, 1)
            : 0.0;

        $optimized = $this->buildOptimizedSummary($lines, $winnerStore['total'] ?? null);

        $containsMockData = collect($lines)->contains(
            fn ($line) => collect(Stores::KEYS)->contains(fn ($store) => $line['stores'][$store]['product']?->source === 'mock')
        );

        return [
            'lines' => $lines,
            'stores' => $stores,
            'winner' => [
                'store' => $winnerStore['store'] ?? null,
                'total' => $winnerStore['total'] ?? null,
                'savings' => $savings,
                'savingsPercentage' => $savingsPercentage,
            ],
            'optimized' => $optimized,
            'containsMockData' => $containsMockData,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $lines
     */
    private function buildOptimizedSummary(array $lines, ?float $bestCompleteTotal): array
    {
        $allocations = [];
        foreach (Stores::KEYS as $store) {
            $allocations[$store] = ['total' => 0.0, 'items' => 0, 'lines' => []];
        }

        foreach ($lines as $line) {
            $store = $line['bestStore'];
            if (! $store) {
                continue;
            }

            $selected = $line['stores'][$store];
            if (! $selected['product'] || $selected['subtotal'] === null) {
                continue;
            }

            $allocations[$store]['total'] = round($allocations[$store]['total'] + $selected['subtotal'], 2);
            $allocations[$store]['items'] += 1;
            $allocations[$store]['lines'][] = [
                'query' => $line['query'],
                'quantity' => $line['quantity'],
                'subtotal' => $selected['subtotal'],
                'product' => $selected['product'],
            ];
        }

        $total = round(collect(Stores::KEYS)->sum(fn ($store) => $allocations[$store]['total']), 2);
        $savingsVsBestComplete = $bestCompleteTotal !== null ? round($bestCompleteTotal - $total, 2) : 0.0;

        return [
            'total' => $total,
            'savingsVsBestComplete' => $savingsVsBestComplete,
            'allocations' => $allocations,
        ];
    }
}
