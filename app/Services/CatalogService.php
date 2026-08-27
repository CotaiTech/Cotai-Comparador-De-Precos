<?php

namespace App\Services;

use App\Models\Product;
use App\Support\Stores;
use Illuminate\Support\Collection;

class CatalogService
{
    /**
     * Busca por loja, com produtos reais priorizados e limite por loja,
     * intercalando o resultado entre supermercados (substitui a busca ao
     * vivo dos providers originais, removida nesta versão MVP).
     */
    public function search(string $query, int $perStore = 8): Collection
    {
        $normalized = ProductNormalizer::normalizeProductName($query);

        $perStoreResults = collect(Stores::KEYS)->map(function ($store) use ($normalized, $perStore) {
            return Product::query()
                ->where('store', $store)
                ->where('normalized_name', 'like', '%'.$normalized.'%')
                ->get()
                ->sort(function (Product $a, Product $b) {
                    if ($a->source !== $b->source) {
                        return $a->source === 'real' ? -1 : 1;
                    }

                    return $a->price <=> $b->price;
                })
                ->take($perStore)
                ->values();
        });

        return $this->interleave($perStoreResults);
    }

    public function promotions(): Collection
    {
        return Product::query()
            ->where('promotion', true)
            ->get()
            ->sortByDesc('discount_percentage')
            ->values();
    }

    /**
     * @return array<string, Collection<int, Product>>
     */
    public function productsByStore(): array
    {
        $products = Product::all()->groupBy('store');

        return collect(Stores::KEYS)->mapWithKeys(
            fn ($store) => [$store => $products->get($store, collect())]
        )->all();
    }

    private function interleave(Collection $groups): Collection
    {
        $max = $groups->map->count()->max() ?? 0;
        $merged = collect();

        for ($index = 0; $index < $max; $index++) {
            foreach ($groups as $group) {
                if ($group->has($index)) {
                    $merged->push($group->get($index));
                }
            }
        }

        return $merged;
    }
}
