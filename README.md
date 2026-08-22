# CotaÍ

Aplicação web em Next.js para comparar uma lista de compras entre supermercados, destacar promoções e sugerir uma compra otimizada item a item.

## Objetivo

O MVP foi desenhado para o fluxo principal do hackathon:

1. Pesquisar produtos.
2. Adicionar itens à lista.
3. Ajustar quantidades.
4. Comparar o total entre supermercados.
5. Descobrir a melhor compra completa.
6. Ver a compra otimizada escolhendo a loja mais barata por produto.

O produto também possui uma camada voltada a restaurantes: perfil de operação, Radar CotaÍ, custo de deslocamento, histórico de planejamentos, relatórios e importação assistida de nota fiscal.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- Lucide Icons
- API Routes / Route Handlers
- Persistência simples com JSON para catálogos e `localStorage` para a lista
- Login local com sessões em cookie `httpOnly`
- Vitest para testes

## Arquitetura

Estrutura principal:

```text
src/
  app/
    api/
      account/
      auth/
      compare/
      plannings/
      products/
      promotions/
      radar/
    comparar/
    promocoes/
    page.tsx
  components/
  data/
  lib/
  providers/
```

Separação de responsabilidades:

- `providers/`: integrações por supermercado e fallback mock.
- `data/`: snapshot real verificado e catálogo mock.
- `lib/normalize-product.ts`: normalização e extração de embalagem.
- `lib/matching.ts`: similaridade e matching entre descrições diferentes.
- `lib/compare-cart.ts`: totais, vencedor e compra otimizada.
- `components/`: interface do MVP.
- `lib/auth.ts`: contas, sessões, perfil, radar e planejamentos persistidos em JSON.
- `lib/route-optimizer.ts`: cenários de rota com distância e combustível.
- `lib/receipt-parser.ts`: leitura estruturada do texto de cupons fiscais.

## Recursos para restaurantes

- Cadastro personalizado com perfil alimentar e dados operacionais.
- Plano CotaÍ Pro demonstrativo de R$ 119,90/mês, sem cobrança real.
- Radar de produtos de alto interesse e busca de promoções relacionadas.
- Cenários de rota rápida, curta e de máxima economia considerando combustível.
- Planejamentos nomeados e associados à conta da empresa.
- Histórico com economia acumulada.
- Relatórios resumido e completo, com visualização e opção de salvar em PDF pelo navegador.
- Importação assistida de nota fiscal por texto e tentativa de leitura de QR Code da NFC-e.
- Tour inicial e animação de entrada da marca.

## Providers

Interface base:

```ts
interface StoreProvider {
  searchProducts(query: string): Promise<Product[]>;
  getProducts(): Promise<Product[]>;
  getPromotions(): Promise<Product[]>;
}
```

Implementações atuais:

- `SupermercadoEscolaProvider`
  - Estratégia híbrida.
  - Usa snapshot local de produtos reais verificados publicamente.
  - Tenta busca pública no site com fallback para dados locais/mock.
- `AmantinoProvider`
  - Estratégia híbrida com scraper ao vivo.
  - Usa um scraper em Puppeteer para carregar a página pública renderizada e extrair resultados de busca e promoções.
  - Tem fallback local apenas se o site falhar temporariamente.
- `BhProvider`
  - Consulta o autocomplete público usado pelo site oficial para localizar Viçosa/MG.
  - Consulta o endpoint público de folhetos vigentes e extrai os PDFs textuais.
  - Obtém nome, embalagem, preço promocional, preço anterior, desconto e URL de origem.
- `BahamasProvider`
  - Descobre automaticamente os PDFs atuais na página oficial de encartes.
  - Por padrão usa a região Zona da Mata (`BAHAMAS_REGION=zm`).
  - Lê apenas PDFs com texto suficientemente estruturado; encartes compostos só por imagens são ignorados.

Os providers de folhetos mantêm cache em memória por 30 minutos. É possível alterar o período com `FLYER_CACHE_MINUTES` e a cidade do BH com `BH_CITY`/`BH_STATE`.

## Dados reais e simulados

### Dados reais verificados

Atualmente o projeto inclui um pequeno snapshot local de produtos do Supermercado Escola, com preços observados em páginas públicas do site em 22/08/2026:

- Manteiga Viçosa 500g
- Requeijão Viçosa Cremoso Pote 400g
- Creme de Ricota Viçosa Pote 200g
- Doce de Leite Viçosa Tradicional 400g
- Leite Viçosa Tipo C 1L

Também são consultadas automaticamente as ofertas vigentes publicadas nos folhetos oficiais do Supermercados BH para Viçosa/MG e do Bahamas para a Zona da Mata. Cada produto extraído mantém `source: "real"`, horário da consulta e link para o PDF de origem.

### Dados simulados

- Parte do catálogo complementar do Supermercado Escola.
- Fallback local do Amantino somente se a coleta ao vivo falhar.
- Catálogo complementar de BH e Bahamas para itens ausentes nos folhetos ou quando a fonte oficial estiver indisponível.

Quando algum fallback é usado, os cards exibem `Preço demonstrativo`.

## Como instalar

```bash
npm install
```

## Como executar

```bash
npm run dev
```

Aplicação padrão em:

```text
http://localhost:3000
```

## Como funcionam as comparações

- A busca retorna produtos dos providers disponíveis.
- O carrinho guarda a lista localmente no navegador.
- A comparação usa matching por similaridade textual, marca e embalagem.
- Produtos com embalagens incompatíveis não são tratados como equivalentes automaticamente.
- Produtos indisponíveis aparecem como `Não encontrado`, nunca como `R$ 0,00`.
- O vencedor da compra completa só é declarado quando as duas lojas encontram todos os itens.
- A compra otimizada escolhe o menor subtotal disponível por produto.

## Como atualizar os produtos

### Snapshot real do Supermercado Escola

Atualize o arquivo:

- `src/data/products.json`

### Catálogo mock

Atualize o arquivo:

- `src/data/mock-catalog.ts`

### Scraper do Amantino

Executar busca ao vivo:

```bash
npm run scrape:amantino -- --query arroz
```

Executar promoções ao vivo:

```bash
npm run scrape:amantino -- --promocoes
```

### Folhetos do BH e Bahamas

Atualizar e conferir a contagem dos encartes vigentes:

```bash
npm run scrape:flyers
```

Filtrar uma loja ou imprimir os produtos no formato usado pelo site:

```bash
npm run scrape:flyers -- --store bh --json
npm run scrape:flyers -- --store bahamas --json
```

## Login

O MVP possui cadastro e login para restaurantes/empresas em `/login`.

- As contas ficam em `data/users.json` no ambiente local.
- Senhas são armazenadas usando hash `scrypt`, nunca em texto puro.
- A sessão é mantida em cookie `httpOnly` por até 30 dias.
- Essa persistência é apropriada para a demonstração local. Em produção, substitua o arquivo JSON por SQLite ou um banco gerenciado e configure uma estratégia de recuperação de senha.

A identidade da empresa já está disponível para que histórico de economia e estoque sejam vinculados à conta em uma próxima etapa.

## Testes incluídos

Cobertura atual:

- `normalizeProductName()`
- `calculateProductSimilarity()`
- subtotal do produto
- total do carrinho
- supermercado vencedor
- economia em reais
- economia percentual
- produto inexistente em uma loja
- comparação por kg
- comparação por litro

## Limitações atuais

- O provider do Supermercado Escola é híbrido e não depende exclusivamente do site para o MVP funcionar.
- O scraper do Amantino depende da renderização pública atual da página e pode precisar ajustes se a estrutura visual/DOM mudar.
- Os scrapers de folhetos dependem dos endpoints, links e estrutura textual pública dos PDFs. PDFs somente com imagens são descartados porque o MVP não executa OCR.
- Preço publicado em folheto confirma oferta e vigência, mas não confirma estoque em tempo real da loja; a disponibilidade continua sujeita ao aviso do próprio encarte.
- A busca ao vivo do Supermercado Escola usa parsing HTML simples e pode precisar ajustes se o markup público mudar.
- Não há recuperação de senha, controle de permissões, checkout, pagamento, pedidos reais ou painel administrativo.
- O plano de R$ 119,90 é apenas demonstrativo; não há cobrança ou gateway de pagamento.
- Distâncias e preço do combustível são configurados manualmente no perfil. Mapas, trânsito e preço oficial ao vivo ainda não estão integrados.
- A foto da nota tenta reconhecer o QR Code quando o navegador oferece suporte. OCR completo da imagem ainda não está disponível; o texto pode ser colado ou digitado para importação.
- “Salvar em PDF” usa o diálogo de impressão do navegador.
