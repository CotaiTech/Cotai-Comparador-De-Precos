<?php

namespace Tests\Unit;

use App\Models\Product;
use App\Services\CompareCartService;
use App\Services\ProductMatcher;
use App\Services\ProductNormalizer;
use App\Support\Stores;
use Database\Seeders\ProductSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Porta os testes originais de src/lib/normalize-product.test.ts para
 * validar que a lógica de normalização/matching/comparação se comporta
 * de forma idêntica após a migração para PHP.
 */
class CatalogLogicTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(ProductSeeder::class);
    }

    public function test_normaliza_acentos_caixa_e_pontuacao(): void
    {
        $this->assertSame('coca cola pet 2 l', ProductNormalizer::normalizeProductName('COCA-COLA PET 2LT'));
    }

    public function test_encontra_similaridade_alta_para_o_mesmo_produto(): void
    {
        $coca = Product::findOrFail('amantino-mock-refrigerante-coca-2l');
        $this->assertGreaterThan(0.7, ProductMatcher::calculateProductSimilarity('Coca Cola 2L', $coca));
    }

    public function test_penaliza_embalagens_incompativeis(): void
    {
        $agua = Product::findOrFail('amantino-mock-agua-1-5l');
        $this->assertLessThan(0.45, ProductMatcher::calculateProductSimilarity('Coca Cola 2L', $agua));
    }

    public function test_penaliza_categoria_conflitante(): void
    {
        $papelHigienico = Product::findOrFail('amantino-mock-papel-higienico-12un');
        $this->assertSame(0.0, ProductMatcher::calculateProductSimilarity('Papel toalha 2un', $papelHigienico));
    }

    public function test_penaliza_produto_com_base_semantica_diferente(): void
    {
        $leite = Product::findOrFail('escola-mock-leite-1l');
        $this->assertSame(0.0, ProductMatcher::calculateProductSimilarity('Leite condensado 395g', $leite));
    }

    public function test_classifica_categorias_diferentes_para_evitar_falso_positivo(): void
    {
        $this->assertSame('papel-toalha', ProductNormalizer::classifyProduct('Papel toalha 2 unidades'));
        $this->assertSame('papel-higienico', ProductNormalizer::classifyProduct('Papel higiênico 12 unidades'));
    }

    public function test_recusa_match_ambiguo_entre_embalagens_e_nomes_proximos(): void
    {
        $products = collect([
            Product::findOrFail('escola-mock-papel-toalha-2un'),
            Product::findOrFail('escola-mock-papel-higienico-12un'),
        ]);

        $result = ProductMatcher::findBestMatch('Papel toalha 2un', $products);
        $this->assertSame('escola-mock-papel-toalha-2un', $result['product']->id);
    }

    public function test_calcula_subtotal_do_produto(): void
    {
        $this->assertSame(25.47, \App\Services\PricingService::getProductSubtotal(8.49, 3));
    }

    public function test_calcula_preco_por_kg(): void
    {
        $queijo = Product::findOrFail('escola-mock-queijo-mussarela-500g');
        $unitPrice = \App\Services\PricingService::getUnitPrice($queijo);
        $this->assertSame(49.9, round($unitPrice['value'], 4));
        $this->assertSame('kg', $unitPrice['unit']);
    }

    public function test_calcula_preco_por_litro(): void
    {
        $oleo = Product::findOrFail('escola-mock-oleo-900ml');
        $unitPrice = \App\Services\PricingService::getUnitPrice($oleo);
        $this->assertEqualsWithDelta(9.766666666666666, $unitPrice['value'], 0.0000001);
        $this->assertSame('l', $unitPrice['unit']);
    }

    /**
     * Equivalente ao fixture `mockProducts` dos testes originais: apenas o
     * catálogo demonstrativo, sem o snapshot real da Supermercado Escola.
     */
    private function productsByStore(): array
    {
        $all = Product::query()->where('source', 'mock')->get()->groupBy('store');

        return collect(Stores::KEYS)->mapWithKeys(fn ($store) => [$store => $all->get($store, collect())])->all();
    }

    public function test_calcula_total_do_carrinho(): void
    {
        $result = (new CompareCartService)->compareCart([
            ['query' => 'Arroz 5kg', 'quantity' => 2],
            ['query' => 'Feijão 1kg', 'quantity' => 1],
        ], $this->productsByStore());

        $this->assertSame(64.29, $result['stores']['escola']['total']);
    }

    public function test_define_supermercado_vencedor_quando_ambos_encontram_tudo(): void
    {
        $result = (new CompareCartService)->compareCart([
            ['query' => 'Arroz 5kg', 'quantity' => 2],
            ['query' => 'Feijão 1kg', 'quantity' => 5],
            ['query' => 'Óleo 900ml', 'quantity' => 3],
        ], $this->productsByStore());

        $this->assertSame('bahamas', $result['winner']['store']);
    }

    public function test_calcula_economia_em_reais_e_percentual(): void
    {
        $result = (new CompareCartService)->compareCart([
            ['query' => 'Manteiga Viçosa 500g', 'quantity' => 2],
        ], $this->productsByStore());

        $this->assertSame(1.22, $result['winner']['savings']);
        $this->assertSame(3.2, $result['winner']['savingsPercentage']);
    }

    public function test_marca_produto_inexistente_em_uma_loja_como_nao_encontrado(): void
    {
        $productsByStore = $this->productsByStore();
        $productsByStore['escola'] = $productsByStore['escola']->filter(
            fn (Product $product) => ! str_contains($product->name, 'Alface')
        )->values();

        $result = (new CompareCartService)->compareCart([
            ['query' => 'Alface unidade', 'quantity' => 1],
        ], $productsByStore);

        $this->assertSame(0, $result['stores']['escola']['foundItems']);
        $this->assertFalse($result['stores']['escola']['complete']);
        $this->assertNull($result['winner']['store']);
    }
}
