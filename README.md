# CotaÍ

Aplicação web em PHP/Laravel para comparar uma lista de compras entre supermercados, destacar promoções e sugerir uma compra otimizada item a item.

Esta versão substitui a stack original (Next.js/TypeScript/React) por uma stack "mais raiz": **Laravel + Blade + PHP sessions + Eloquent/SQLite**, sem framework de frontend. Toda a interação (buscar, adicionar à lista, ajustar quantidade, comparar) acontece por formulários HTML tradicionais com `POST`/redirect, no estilo clássico de aplicação PHP.

## Objetivo

1. Pesquisar produtos.
2. Adicionar itens à lista.
3. Ajustar quantidades.
4. Comparar o total entre supermercados.
5. Descobrir a melhor compra completa.
6. Ver a compra otimizada escolhendo a loja mais barata por produto.

## Stack

- PHP 8.3+ / Laravel 13
- Blade (server-side rendering, sem JS de framework)
- Eloquent + SQLite (trocável por MySQL/Postgres via `.env`)
- Sessões nativas do Laravel (`SESSION_DRIVER=database`) para autenticação **e** para o carrinho de compras
- Tailwind CSS (via Vite, apenas para estilos — nenhum JavaScript de aplicação é necessário)
- PHPUnit para testes

## Como rodar

```bash
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
npm install && npm run build   # ou `npm run dev` durante o desenvolvimento
php artisan serve
```

## Testes

```bash
php artisan test
```

Os testes em `tests/Unit/CatalogLogicTest.php` portam 1:1 os casos que existiam em `src/lib/normalize-product.test.ts` na versão Next.js, garantindo que a normalização de nomes, o matching de produtos e o cálculo de comparação de carrinho se comportam de forma idêntica após a reescrita.

## Arquitetura

```text
app/
  Http/Controllers/
    HomeController.php      # página inicial e /promocoes
    CartController.php      # carrinho em sessão (add/update/remove/clear/compare)
    Auth/                   # login e registro (sessão nativa do Laravel)
  Models/
    Product.php
  Services/
    ProductNormalizer.php   # normalização de nomes, embalagem, marca e categoria
    ProductMatcher.php      # similaridade e matching entre descrições diferentes
    PricingService.php      # preço por unidade/kg/litro e subtotal
    CompareCartService.php  # totais, vencedor e compra otimizada
    CatalogService.php      # busca, promoções e agrupamento por loja
  Support/
    Stores.php              # chaves e metadados das 4 lojas
    Format.php              # formatação de moeda e data
database/
  migrations/
  seeders/ProductSeeder.php # catálogo demonstrativo + snapshot real da Supermercado Escola
resources/views/
  layouts/app.blade.php
  home.blade.php
  auth/
  partials/
```

## O que mudou de propósito em relação à versão Next.js

- **Carrinho em sessão PHP**, não mais em `localStorage` do navegador: adicionar/remover/ajustar quantidade são formulários `POST` que redirecionam de volta (padrão Post/Redirect/Get).
- **Busca via formulário `GET`**, sem busca "ao vivo" por JavaScript: digite e pressione buscar; a página recarrega com os resultados.
- **Login/registro sem JavaScript**: formulários simples com validação e mensagens de erro do lado do servidor (`$errors`/`old()`), sessão de autenticação nativa do Laravel.

## Fora do escopo desta migração

Esta reescrita cobriu o **fluxo principal** (busca, carrinho, comparação, promoções e autenticação). Os seguintes recursos existiam na versão Next.js e **não foram portados** — ficam registrados aqui para uma eventual v2:

- Scrapers ao vivo (Puppeteer/HTML) dos supermercados Amantino e BH, e a busca ao vivo do Supermercado Escola. O catálogo agora é 100% estático (seed), como já era o fallback mock/real da versão original.
- Radar CotaÍ (acompanhar produtos), Relatórios (resumo/completo, exportação em PDF), Importação de nota fiscal (parser + leitura de QR Code da NFC-e).
- Perfil de operação do restaurante, cenários de rota/combustível e personalização por preferência alimentar.
- Plano CotaÍ Pro (tela de assinatura demonstrativa).

## Providers originais

A versão Next.js tinha uma camada de `providers` por supermercado (real/híbrido/mock) com scraping ao vivo. Como o scraping ficou fora do escopo desta migração, o `CatalogService` consulta diretamente a tabela `products`, já populada pelo seeder com o mesmo catálogo demonstrativo (`mock`) e o snapshot real da Supermercado Escola (`real`) que existiam em `src/data/mock-catalog.ts` e `src/data/products.json`.
