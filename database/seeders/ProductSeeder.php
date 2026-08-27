<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Services\ProductNormalizer;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    private const UPDATED_AT = '2026-08-22 14:32:00';

    /**
     * Catálogo demonstrativo: mesmo preço-base por produto, variando por
     * supermercado, usado como fallback nas quatro lojas (equivalente ao
     * antigo mock-catalog.ts).
     */
    private const SEEDS = [
        ['key' => 'arroz-5kg', 'name' => 'Arroz Tipo 1 5kg', 'brand' => 'Camil', 'quantity' => 5, 'unit' => 'kg', 'packageText' => '5kg', 'prices' => ['escola' => 27.9, 'amantino' => 25.9, 'bh' => 26.49, 'bahamas' => 24.99], 'originalPrices' => ['bh' => 28.49, 'bahamas' => 27.49]],
        ['key' => 'feijao-1kg', 'name' => 'Feijão Carioca 1kg', 'brand' => 'Kicaldo', 'quantity' => 1, 'unit' => 'kg', 'packageText' => '1kg', 'prices' => ['escola' => 8.49, 'amantino' => 7.99, 'bh' => 7.79, 'bahamas' => 7.49], 'originalPrices' => ['bh' => 8.29, 'bahamas' => 8.19]],
        ['key' => 'oleo-900ml', 'name' => 'Óleo de Soja 900ml', 'brand' => 'Soya', 'quantity' => 900, 'unit' => 'ml', 'packageText' => '900ml', 'prices' => ['escola' => 8.79, 'amantino' => 8.99, 'bh' => 8.69, 'bahamas' => 8.39], 'originalPrices' => ['bahamas' => 8.99]],
        ['key' => 'leite-1l', 'name' => 'Leite UHT Integral 1L', 'brand' => 'Itambé', 'quantity' => 1, 'unit' => 'l', 'packageText' => '1L', 'prices' => ['escola' => 5.69, 'amantino' => 5.39, 'bh' => 5.29, 'bahamas' => 4.99], 'originalPrices' => ['bh' => 5.59, 'bahamas' => 5.49]],
        ['key' => 'acucar-5kg', 'name' => 'Açúcar Cristal 5kg', 'brand' => 'Delta', 'quantity' => 5, 'unit' => 'kg', 'packageText' => '5kg', 'prices' => ['escola' => 19.99, 'amantino' => 20.49, 'bh' => 18.99, 'bahamas' => 18.49], 'originalPrices' => ['bh' => 20.49, 'bahamas' => 19.99]],
        ['key' => 'cafe-500g', 'name' => 'Café Torrado e Moído 500g', 'brand' => 'Pilão', 'quantity' => 500, 'unit' => 'g', 'packageText' => '500g', 'prices' => ['escola' => 18.9, 'amantino' => 17.49, 'bh' => 17.99, 'bahamas' => 16.99], 'originalPrices' => ['bahamas' => 18.49]],
        ['key' => 'farinha-trigo-1kg', 'name' => 'Farinha de Trigo 1kg', 'brand' => 'Dona Benta', 'quantity' => 1, 'unit' => 'kg', 'packageText' => '1kg', 'prices' => ['escola' => 6.49, 'amantino' => 6.99, 'bh' => 6.29, 'bahamas' => 5.99], 'originalPrices' => ['bahamas' => 6.49]],
        ['key' => 'macarrao-500g', 'name' => 'Macarrão Espaguete 500g', 'brand' => 'Renata', 'quantity' => 500, 'unit' => 'g', 'packageText' => '500g', 'prices' => ['escola' => 4.99, 'amantino' => 4.69, 'bh' => 4.39, 'bahamas' => 4.19], 'originalPrices' => ['bh' => 4.79, 'bahamas' => 4.59]],
        ['key' => 'manteiga-500g', 'name' => 'Manteiga Viçosa 500g', 'brand' => 'Viçosa', 'quantity' => 500, 'unit' => 'g', 'packageText' => '500g', 'prices' => ['escola' => 18.9, 'amantino' => 20.9, 'bh' => 19.49, 'bahamas' => 18.29], 'originalPrices' => ['escola' => 22.9, 'bh' => 21.9, 'bahamas' => 21.49]],
        ['key' => 'queijo-mussarela-500g', 'name' => 'Queijo Mussarela 500g', 'brand' => 'Viçosa', 'quantity' => 500, 'unit' => 'g', 'packageText' => '500g', 'prices' => ['escola' => 24.95, 'amantino' => 26.9, 'bh' => 24.49, 'bahamas' => 23.79], 'originalPrices' => ['bh' => 26.49, 'bahamas' => 25.99]],
        ['key' => 'presunto-500g', 'name' => 'Presunto Cozido 500g', 'brand' => 'Sadia', 'quantity' => 500, 'unit' => 'g', 'packageText' => '500g', 'prices' => ['escola' => 17.9, 'amantino' => 16.9, 'bh' => 16.49, 'bahamas' => 15.99], 'originalPrices' => ['bh' => 17.49, 'bahamas' => 16.99]],
        ['key' => 'pao-forma-500g', 'name' => 'Pão de Forma Tradicional 500g', 'brand' => 'Pullman', 'quantity' => 500, 'unit' => 'g', 'packageText' => '500g', 'prices' => ['escola' => 9.49, 'amantino' => 8.99, 'bh' => 8.79, 'bahamas' => 8.59], 'originalPrices' => ['bh' => 9.19]],
        ['key' => 'refrigerante-coca-2l', 'name' => 'Refrigerante Coca-Cola 2L', 'brand' => 'Coca-Cola', 'quantity' => 2, 'unit' => 'l', 'packageText' => '2L', 'prices' => ['escola' => 11.49, 'amantino' => 10.99, 'bh' => 10.49, 'bahamas' => 9.99], 'originalPrices' => ['amantino' => 12.49, 'bh' => 11.49, 'bahamas' => 11.29]],
        ['key' => 'suco-uva-1l', 'name' => 'Suco de Uva Integral 1L', 'brand' => 'Aurora', 'quantity' => 1, 'unit' => 'l', 'packageText' => '1L', 'prices' => ['escola' => 15.99, 'amantino' => 16.49, 'bh' => 14.99, 'bahamas' => 14.79], 'originalPrices' => ['bh' => 15.99]],
        ['key' => 'agua-1-5l', 'name' => 'Água Mineral 1,5L', 'brand' => 'Minalba', 'quantity' => 1.5, 'unit' => 'l', 'packageText' => '1,5L', 'prices' => ['escola' => 3.49, 'amantino' => 3.29, 'bh' => 3.19, 'bahamas' => 2.99], 'originalPrices' => ['bahamas' => 3.39]],
        ['key' => 'carne-patinho-1kg', 'name' => 'Patinho Bovino Kg', 'brand' => 'Friboi', 'quantity' => 1, 'unit' => 'kg', 'packageText' => 'kg', 'prices' => ['escola' => 39.9, 'amantino' => 41.9, 'bh' => 37.99, 'bahamas' => 36.9], 'originalPrices' => ['bh' => 39.99, 'bahamas' => 38.99]],
        ['key' => 'frango-peito-1kg', 'name' => 'Peito de Frango Kg', 'brand' => 'Seara', 'quantity' => 1, 'unit' => 'kg', 'packageText' => 'kg', 'prices' => ['escola' => 18.9, 'amantino' => 17.9, 'bh' => 16.99, 'bahamas' => 16.49], 'originalPrices' => ['bh' => 18.49, 'bahamas' => 17.79]],
        ['key' => 'linguica-1kg', 'name' => 'Linguiça Toscana Kg', 'brand' => 'Sadia', 'quantity' => 1, 'unit' => 'kg', 'packageText' => 'kg', 'prices' => ['escola' => 22.9, 'amantino' => 23.9, 'bh' => 21.99, 'bahamas' => 21.49], 'originalPrices' => ['bh' => 23.49]],
        ['key' => 'tomate-1kg', 'name' => 'Tomate Italiano Kg', 'quantity' => 1, 'unit' => 'kg', 'packageText' => 'kg', 'prices' => ['escola' => 9.99, 'amantino' => 8.99, 'bh' => 8.49, 'bahamas' => 7.99], 'originalPrices' => ['bh' => 9.49, 'bahamas' => 8.99]],
        ['key' => 'batata-1kg', 'name' => 'Batata Inglesa Kg', 'quantity' => 1, 'unit' => 'kg', 'packageText' => 'kg', 'prices' => ['escola' => 6.99, 'amantino' => 7.49, 'bh' => 6.49, 'bahamas' => 5.99], 'originalPrices' => ['bh' => 6.99, 'bahamas' => 6.79]],
        ['key' => 'cebola-1kg', 'name' => 'Cebola Kg', 'quantity' => 1, 'unit' => 'kg', 'packageText' => 'kg', 'prices' => ['escola' => 5.99, 'amantino' => 5.69, 'bh' => 5.29, 'bahamas' => 4.99], 'originalPrices' => ['bahamas' => 5.59]],
        ['key' => 'alface-un', 'name' => 'Alface Crespa Unidade', 'quantity' => 1, 'unit' => 'un', 'packageText' => 'un', 'prices' => ['escola' => 3.49, 'amantino' => 2.99, 'bh' => 2.79, 'bahamas' => 2.49], 'originalPrices' => ['bh' => 3.29, 'bahamas' => 2.99]],
        ['key' => 'detergente-500ml', 'name' => 'Detergente Líquido 500ml', 'brand' => 'Ypê', 'quantity' => 500, 'unit' => 'ml', 'packageText' => '500ml', 'prices' => ['escola' => 2.99, 'amantino' => 3.29, 'bh' => 2.79, 'bahamas' => 2.69], 'originalPrices' => ['bh' => 2.99, 'bahamas' => 2.89]],
        ['key' => 'sabao-po-2kg', 'name' => 'Sabão em Pó 2kg', 'brand' => 'OMO', 'quantity' => 2, 'unit' => 'kg', 'packageText' => '2kg', 'prices' => ['escola' => 24.9, 'amantino' => 25.9, 'bh' => 23.99, 'bahamas' => 22.49], 'originalPrices' => ['bahamas' => 24.99]],
        ['key' => 'papel-toalha-2un', 'name' => 'Papel Toalha 2 Unidades', 'brand' => 'Snob', 'quantity' => 2, 'unit' => 'un', 'packageText' => '2un', 'prices' => ['escola' => 6.49, 'amantino' => 5.99, 'bh' => 5.79, 'bahamas' => 5.49], 'originalPrices' => ['bahamas' => 5.99]],
        ['key' => 'papel-higienico-12un', 'name' => 'Papel Higiênico 12 Unidades', 'brand' => 'Neve', 'quantity' => 12, 'unit' => 'un', 'packageText' => '12un', 'prices' => ['escola' => 22.9, 'amantino' => 21.9, 'bh' => 19.99, 'bahamas' => 18.99], 'originalPrices' => ['bh' => 22.49, 'bahamas' => 21.49]],
        ['key' => 'molho-tomate-300g', 'name' => 'Molho de Tomate Tradicional 300g', 'brand' => 'Heinz', 'quantity' => 300, 'unit' => 'g', 'packageText' => '300g', 'prices' => ['escola' => 3.29, 'amantino' => 3.59, 'bh' => 3.19, 'bahamas' => 2.99], 'originalPrices' => ['bahamas' => 3.39]],
        ['key' => 'queijo-parmesao-100g', 'name' => 'Queijo Parmesão Ralado 100g', 'brand' => 'Vigor', 'quantity' => 100, 'unit' => 'g', 'packageText' => '100g', 'prices' => ['escola' => 7.99, 'amantino' => 8.49, 'bh' => 7.69, 'bahamas' => 7.29], 'originalPrices' => ['bahamas' => 7.99]],
        ['key' => 'requeijao-400g', 'name' => 'Requeijão Cremoso 400g', 'brand' => 'Viçosa', 'quantity' => 400, 'unit' => 'g', 'packageText' => '400g', 'prices' => ['escola' => 14.89, 'amantino' => 15.49, 'bh' => 13.99, 'bahamas' => 13.49], 'originalPrices' => ['escola' => 16.89, 'bh' => 15.49, 'bahamas' => 14.99]],
        ['key' => 'doce-leite-400g', 'name' => 'Doce de Leite Viçosa 400g', 'brand' => 'Viçosa', 'quantity' => 400, 'unit' => 'g', 'packageText' => '400g', 'prices' => ['escola' => 23.9, 'amantino' => 24.9, 'bh' => 22.99, 'bahamas' => 21.99], 'originalPrices' => ['bahamas' => 23.99]],
    ];

    /**
     * Snapshot real verificado publicamente no Supermercado Escola
     * (equivalente ao antigo data/products.json).
     */
    private const REAL_ESCOLA_PRODUCTS = [
        ['id' => 'escola-real-manteiga-vicosa-500g', 'externalId' => 'manteiga-vicosa-500g', 'name' => 'Manteiga Viçosa 500g', 'brand' => 'Viçosa', 'quantity' => 500, 'unit' => 'g', 'packageText' => '500g', 'price' => 18.9, 'originalPrice' => 22.9, 'discountPercentage' => 17, 'promotion' => true, 'imageUrl' => 'https://supermercadoescola.org.br/media/catalog/product/cache/placeholder/image.jpg', 'productUrl' => 'https://supermercadoescola.org.br/'],
        ['id' => 'escola-real-requeijao-vicosa-400g', 'externalId' => 'requeijao-vicosa-400g', 'name' => 'Requeijão Viçosa Cremoso Pote 400g', 'brand' => 'Viçosa', 'quantity' => 400, 'unit' => 'g', 'packageText' => '400g', 'price' => 14.89, 'originalPrice' => 16.89, 'discountPercentage' => 12, 'promotion' => true, 'productUrl' => 'https://supermercadoescola.org.br/'],
        ['id' => 'escola-real-creme-ricota-vicosa-200g', 'name' => 'Creme de Ricota Viçosa Pote 200g', 'brand' => 'Viçosa', 'quantity' => 200, 'unit' => 'g', 'packageText' => '200g', 'price' => 5.9, 'promotion' => false, 'productUrl' => 'https://supermercadoescola.org.br/'],
        ['id' => 'escola-real-doce-leite-vicosa-400g', 'name' => 'Doce de Leite Viçosa Tradicional 400g', 'brand' => 'Viçosa', 'quantity' => 400, 'unit' => 'g', 'packageText' => '400g', 'price' => 23.9, 'promotion' => false, 'productUrl' => 'https://supermercadoescola.org.br/'],
        ['id' => 'escola-real-leite-vicosa-1l', 'name' => 'Leite Viçosa Tipo C 1L', 'brand' => 'Viçosa', 'quantity' => 1, 'unit' => 'l', 'packageText' => '1L', 'price' => 4.99, 'promotion' => false, 'productUrl' => 'https://supermercadoescola.org.br/categoria/produtos-vi-osa'],
    ];

    public function run(): void
    {
        $rows = [];

        foreach (self::REAL_ESCOLA_PRODUCTS as $seed) {
            $rows[] = $this->buildRow(
                id: $seed['id'],
                store: 'escola',
                name: $seed['name'],
                brand: $seed['brand'] ?? null,
                quantity: $seed['quantity'] ?? null,
                unit: $seed['unit'] ?? null,
                packageText: $seed['packageText'] ?? null,
                price: $seed['price'],
                originalPrice: $seed['originalPrice'] ?? null,
                discountPercentage: $seed['discountPercentage'] ?? null,
                promotion: $seed['promotion'],
                imageUrl: $seed['imageUrl'] ?? null,
                productUrl: $seed['productUrl'] ?? null,
                source: 'real',
                externalId: $seed['externalId'] ?? null,
            );
        }

        foreach (self::SEEDS as $seed) {
            foreach (\App\Support\Stores::KEYS as $store) {
                $price = $seed['prices'][$store];
                $originalPrice = $seed['originalPrices'][$store] ?? null;
                $discountPercentage = ($originalPrice && $originalPrice > $price)
                    ? (int) round((($originalPrice - $price) / $originalPrice) * 100)
                    : null;

                $rows[] = $this->buildRow(
                    id: "{$store}-mock-{$seed['key']}",
                    store: $store,
                    name: $seed['name'],
                    brand: $seed['brand'] ?? null,
                    quantity: $seed['quantity'] ?? null,
                    unit: $seed['unit'] ?? null,
                    packageText: $seed['packageText'] ?? null,
                    price: $price,
                    originalPrice: $originalPrice,
                    discountPercentage: $discountPercentage,
                    promotion: (bool) ($originalPrice && $originalPrice > $price),
                    imageUrl: null,
                    productUrl: null,
                    source: 'mock',
                    externalId: null,
                );
            }
        }

        foreach (array_chunk($rows, 100) as $chunk) {
            Product::query()->upsert($chunk, ['id']);
        }
    }

    private function buildRow(
        string $id,
        string $store,
        string $name,
        ?string $brand,
        ?float $quantity,
        ?string $unit,
        ?string $packageText,
        float $price,
        ?float $originalPrice,
        ?int $discountPercentage,
        bool $promotion,
        ?string $imageUrl,
        ?string $productUrl,
        string $source,
        ?string $externalId,
    ): array {
        return [
            'id' => $id,
            'store' => $store,
            'external_id' => $externalId,
            'name' => $name,
            'normalized_name' => ProductNormalizer::normalizeProductName($name),
            'brand' => $brand,
            'quantity' => $quantity,
            'unit' => $unit,
            'package_text' => $packageText,
            'price' => $price,
            'original_price' => $originalPrice,
            'discount_percentage' => $discountPercentage,
            'promotion' => $promotion,
            'available' => true,
            'image_url' => $imageUrl,
            'product_url' => $productUrl,
            'source' => $source,
            'created_at' => self::UPDATED_AT,
            'updated_at' => self::UPDATED_AT,
        ];
    }
}
