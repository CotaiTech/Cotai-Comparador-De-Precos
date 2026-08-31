import { extractPackaging, inferBrand, normalizeProductName } from "@/lib/normalize-product";
import { persistScrapedProducts } from "@/lib/product-persistence";
import { Product } from "@/providers/types";

type EscolaDataLayerItem = {
  item_id?: string | number;
  item_name?: string;
  price?: string | number;
  item_category?: string;
};

type ScrapeEscolaOptions = {
  query?: string;
  categoryUrls?: string[];
  maxPages?: number;
  concurrency?: number;
};

const ESCOLA_BASE_URL = "https://supermercadoescola.org.br";
const PAGE_DELAY_MS = 500;
const DEFAULT_CATEGORY_CONCURRENCY = 2;
const MAX_SAFETY_PAGES = 200;
const DEFAULT_CATEGORY_URLS = [
  `${ESCOLA_BASE_URL}/categoria/a-cougue`,
  `${ESCOLA_BASE_URL}/categoria/bazar`,
  `${ESCOLA_BASE_URL}/categoria/bebidas`,
  `${ESCOLA_BASE_URL}/categoria/biscoitos-pdaria-externa`,
  `${ESCOLA_BASE_URL}/categoria/bomboniere-doces`,
  `${ESCOLA_BASE_URL}/categoria/cereais`,
  `${ESCOLA_BASE_URL}/categoria/del-cia-da-casa`,
  `${ESCOLA_BASE_URL}/categoria/queijos`,
  `${ESCOLA_BASE_URL}/categoria/frios`,
  `${ESCOLA_BASE_URL}/categoria/granja`,
  `${ESCOLA_BASE_URL}/categoria/grife-super`,
  `${ESCOLA_BASE_URL}/categoria/grife-ufv`,
  `${ESCOLA_BASE_URL}/categoria/hortifr-ti`,
  `${ESCOLA_BASE_URL}/categoria/limpeza`,
  `${ESCOLA_BASE_URL}/categoria/matinais`,
  `${ESCOLA_BASE_URL}/categoria/mercearia`,
  `${ESCOLA_BASE_URL}/categoria/natural-diet`,
  `${ESCOLA_BASE_URL}/categoria/perfumaria-higiene`,
  `${ESCOLA_BASE_URL}/categoria/pet-shop`,
  `${ESCOLA_BASE_URL}/categoria/produtos-vi-osa`,
];

async function fetchPublic(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "text/html,application/json,*/*;q=0.8",
      "user-agent": "CotaI-Hackathon/1.0 (+supermercado-escola-scraper)",
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar ${url}: HTTP ${response.status}`);
  }

  return response.text();
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function categoryLabel(categoryUrl: string) {
  try {
    const url = new URL(categoryUrl);
    return decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? categoryUrl);
  } catch {
    return categoryUrl;
  }
}

function absoluteUrl(pathOrUrl?: string) {
  if (!pathOrUrl) {
    return undefined;
  }

  return new URL(pathOrUrl, ESCOLA_BASE_URL).toString();
}

function parsePrice(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/(?:R\$\s*)?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/);
  if (!match) {
    return null;
  }

  const normalized = match[1].replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const price = Number(normalized);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function htmlDecode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value: string) {
  return htmlDecode(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function toProduct(input: {
  externalId?: string;
  name: string;
  price: number;
  imageUrl?: string;
  productUrl?: string;
  category?: string;
  updatedAt: string;
}) {
  const name = stripTags(input.name);
  const normalizedName = normalizeProductName(name);

  if (!normalizedName || normalizedName.length < 3) {
    return null;
  }

  const packaging = extractPackaging(name);
  const externalId = input.externalId;
  const identity = externalId ?? `${normalizedName}|${packaging.packageText ?? ""}`;

  return {
    id: `escola-real-${stableHash(identity)}`,
    store: "escola",
    externalId,
    name,
    normalizedName,
    brand: inferBrand(name),
    quantity: packaging.quantity,
    unit: packaging.unit,
    packageText: packaging.packageText,
    price: input.price,
    promotion: false,
    available: true,
    imageUrl: absoluteUrl(input.imageUrl),
    productUrl: absoluteUrl(input.productUrl),
    source: "real",
    updatedAt: input.updatedAt,
  } satisfies Product;
}

function extractDataLayerProducts(html: string, pageUrl: string, updatedAt: string) {
  const products: Product[] = [];

  for (const json of extractDataLayerObjects(html)) {
    const parsed = safeJsonParse<{ ecommerce?: { items?: EscolaDataLayerItem[] } }>(json);
    const items = parsed?.ecommerce?.items ?? [];

    for (const item of items) {
      const price = parsePrice(item.price);
      if (!item.item_name || price === null) {
        continue;
      }

      const product = toProduct({
        externalId: item.item_id ? String(item.item_id) : undefined,
        name: item.item_name,
        price,
        category: item.item_category,
        productUrl: pageUrl,
        updatedAt,
      });

      if (product) {
        products.push(product);
      }
    }
  }

  return products;
}

function extractDataLayerObjects(html: string) {
  const results: string[] = [];
  const marker = "dataLayer.push(";
  let searchStart = 0;

  while (searchStart < html.length) {
    const markerIndex = html.indexOf(marker, searchStart);
    if (markerIndex < 0) {
      break;
    }

    const objectStart = html.indexOf("{", markerIndex + marker.length);
    if (objectStart < 0) {
      break;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = objectStart; index < html.length; index += 1) {
      const char = html[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "\"") {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          results.push(html.slice(objectStart, index + 1));
          searchStart = index + 1;
          break;
        }
      }
    }

    if (searchStart <= markerIndex) {
      searchStart = markerIndex + marker.length;
    }
  }

  return results.filter((json) => json.includes("\"items\"") || json.includes("items"));
}

function safeJsonParse<T>(value: string) {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function extractProductCards(html: string, pageUrl: string, updatedAt: string) {
  const products: Product[] = [];
  const cardRegex = /<div class="produto-card[\s\S]*?<\/div>\s*<\/div>/g;

  for (const cardMatch of html.matchAll(cardRegex)) {
    const card = cardMatch[0];
    const name = card.match(/<h3 class="produto-nome">([\s\S]*?)<\/h3>/)?.[1];
    const price = parsePrice(card.match(/<span class="preco-atual">\s*([\s\S]*?)\s*<\/span>/)?.[1]);

    if (!name || price === null) {
      continue;
    }

    const productPath = card.match(/window\.location='([^']+)'/)?.[1];
    const imageUrl = card.match(/<img[^>]+src="([^"]+)"/)?.[1];
    const externalId =
      card.match(/data-url="\/produto\/modal\?id=([^"]+)"/)?.[1] ??
      card.match(/\/produto\/imagem\?id=([^"]+)/)?.[1];

    const product = toProduct({
      externalId,
      name,
      price,
      imageUrl,
      productUrl: productPath ?? pageUrl,
      updatedAt,
    });

    if (product) {
      products.push(product);
    }
  }

  return products;
}

function extractCategoryId(html: string) {
  return html.match(/produtos-ajax\?categoria_id=(\d+)/)?.[1] ?? null;
}

function getPaginationState(html: string, pageProducts: Product[]) {
  const normalizedHtml = normalizeProductName(stripTags(html));
  const lastPageMatch =
    html.match(/data-(?:last|total)-pages?=["']?(\d+)/i) ??
    html.match(/["'](?:last_page|lastPage|total_pages|totalPages)["']\s*:\s*(\d+)/i);
  const currentPageMatch =
    html.match(/data-(?:current-)?page=["']?(\d+)/i) ??
    html.match(/["'](?:current_page|currentPage|page)["']\s*:\s*(\d+)/i);

  return {
    isEmpty: pageProducts.length === 0,
    hasEndMessage:
      normalizedHtml.includes("todos os produtos foram carregados") ||
      normalizedHtml.includes("nenhum produto encontrado") ||
      normalizedHtml.includes("fim"),
    currentPage: currentPageMatch ? Number(currentPageMatch[1]) : null,
    lastPage: lastPageMatch ? Number(lastPageMatch[1]) : null,
  };
}

function reachedLastPage(state: ReturnType<typeof getPaginationState>, fallbackPage: number) {
  const currentPage = state.currentPage ?? fallbackPage;
  return state.lastPage !== null && currentPage >= state.lastPage;
}

async function scrapeCategory(categoryUrl: string, updatedAt: string, maxPages?: number) {
  const label = categoryLabel(categoryUrl);
  console.log(`Fetching category ${label}, initial page...`);
  const firstPageHtml = await fetchPublic(categoryUrl);
  const products = [
    ...extractDataLayerProducts(firstPageHtml, categoryUrl, updatedAt),
    ...extractProductCards(firstPageHtml, categoryUrl, updatedAt),
  ];
  console.log(`Fetched category ${label}, initial page: ${products.length} product(s).`);

  const categoryId = extractCategoryId(firstPageHtml);

  if (categoryId) {
    let page = 1;

    while (page <= (maxPages ?? MAX_SAFETY_PAGES)) {
      const pageUrl = `${ESCOLA_BASE_URL}/produto/produtos-ajax?categoria_id=${categoryId}&page=${page}`;
      console.log(`Fetching category ${label}, page ${page}...`);
      const fragment = await fetchPublic(pageUrl);
      const pageProducts = extractProductCards(fragment, categoryUrl, updatedAt);
      const paginationState = getPaginationState(fragment, pageProducts);

      console.log(`Fetched category ${label}, page ${page}: ${pageProducts.length} product(s).`);

      if (paginationState.isEmpty || paginationState.hasEndMessage) {
        console.log(`Finished category ${label} at page ${page}: empty/end response.`);
        break;
      }

      products.push(...pageProducts);

      if (reachedLastPage(paginationState, page)) {
        console.log(`Finished category ${label} at page ${page}: last page reached.`);
        break;
      }

      page += 1;
      await delay(PAGE_DELAY_MS);
    }

    if (page > (maxPages ?? MAX_SAFETY_PAGES)) {
      console.warn(`Stopped category ${label} after ${maxPages ?? MAX_SAFETY_PAGES} page(s) without an empty page.`);
    }
  }

  const deduped = dedupeProducts(products);
  console.log(`Finished category ${label}: ${deduped.length} unique product(s).`);
  return deduped;
}

async function scrapeCategoriesWithConcurrency(
  categoryUrls: string[],
  concurrency: number,
  updatedAt: string,
  maxPages: number | undefined,
  onCategoryComplete?: (
    result: PromiseSettledResult<Product[]>,
    categoryUrl: string
  ) => Promise<void>
) {
  const results: PromiseSettledResult<Product[]>[] = [];
  const limitedConcurrency = Math.max(1, Math.min(3, concurrency));
  let nextCategoryIndex = 0;

  async function worker(workerNumber: number) {
    while (nextCategoryIndex < categoryUrls.length) {
      const categoryIndex = nextCategoryIndex;
      nextCategoryIndex += 1;
      const categoryUrl = categoryUrls[categoryIndex];

      console.log(
        `Category worker ${workerNumber}: starting ${categoryLabel(categoryUrl)} ` +
          `(${categoryIndex + 1}/${categoryUrls.length})`
      );

      let result: PromiseSettledResult<Product[]>;
      try {
        result = {
          status: "fulfilled",
          value: await scrapeCategory(categoryUrl, updatedAt, maxPages),
        };
      } catch (reason) {
        result = { status: "rejected", reason };
      }

      results[categoryIndex] = result;

      if (onCategoryComplete) {
        await onCategoryComplete(result, categoryUrl);
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(limitedConcurrency, categoryUrls.length) },
      (_, index) => worker(index + 1)
    )
  );

  return results;
}

export async function scrapeSupermercadoEscolaProducts(options: ScrapeEscolaOptions = {}) {
  const updatedAt = new Date().toISOString();
  const concurrency = options.concurrency ?? DEFAULT_CATEGORY_CONCURRENCY;
  const categoryUrls =
    options.categoryUrls ??
    (options.query
      ? [`${ESCOLA_BASE_URL}/catalogsearch/result/?q=${encodeURIComponent(options.query)}`]
      : DEFAULT_CATEGORY_URLS);

  const savedProducts: Product[] = [];
  const normalizedQuery = options.query ? normalizeProductName(options.query) : null;

  const batches = await scrapeCategoriesWithConcurrency(
    categoryUrls,
    concurrency,
    updatedAt,
    options.maxPages,
    async (result, categoryUrl) => {
      if (result.status === "rejected") {
        console.error(`Failed category ${categoryLabel(categoryUrl)}:`, result.reason);
        return;
      }

      const productsToPersist = result.value.filter(
        (product) => !normalizedQuery || product.normalizedName.includes(normalizedQuery)
      );

      if (productsToPersist.length === 0) {
        console.log(`No products to persist for category ${categoryLabel(categoryUrl)}.`);
        return;
      }

      console.log(
        `Persisting ${productsToPersist.length} product(s) from category ${categoryLabel(categoryUrl)}...`
      );
      const persisted = await persistScrapedProducts(productsToPersist);
      savedProducts.push(...persisted);
      console.log(`Persisted ${persisted.length} product(s) from category ${categoryLabel(categoryUrl)}.`);
    }
  );

  for (const batch of batches) {
    if (batch.status === "rejected") {
      console.error("Falha ao raspar produtos do Supermercado Escola:", batch.reason);
    }
  }

  // Keep this guard in case the callback is removed or a caller supplies no batches.
  if (batches.length === 0) {
    return [];
  }

  return dedupeProducts(savedProducts);
}

function dedupeProducts(products: Product[]) {
  const map = new Map<string, Product>();
  for (const product of products) {
    const key = `${product.store}|${product.externalId ?? product.normalizedName}|${product.packageText ?? ""}`;
    const current = map.get(key);
    if (!current || product.price < current.price) {
      map.set(key, product);
    }
  }
  return [...map.values()];
}
