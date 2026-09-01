import { Prisma, ProductSource, ProductUnit } from "@prisma/client";
import { demoProducts } from "@/data/demo-products";
import { compareCart, type CompareResult } from "@/lib/compare-cart";
import db from "@/lib/db";
import { normalizeProductName } from "@/lib/normalize-product";
import {
  containsAllSearchTokens,
  defaultProductSearchLimit,
  paginateProducts,
  productSearchTokenAlternatives,
  productSearchTokens,
  sortProductsBySearchRelevance,
} from "@/lib/product-search";
import { storeKeys } from "@/lib/store";
import { Product, ProductUnit as ApiProductUnit, StoreKey } from "@/providers/types";

export const productWithLatestPrice = Prisma.validator<Prisma.ProductDefaultArgs>()({
  include: {
    priceHistory: {
      orderBy: { observedAt: "desc" },
      take: 1,
      include: { store: true },
    },
  },
});

const promotionWithRelations = Prisma.validator<Prisma.PromotionDefaultArgs>()({
  include: {
    product: true,
    store: true,
  },
});

type ProductWithLatestPrice = Prisma.ProductGetPayload<typeof productWithLatestPrice>;
type PromotionWithRelations = Prisma.PromotionGetPayload<typeof promotionWithRelations>;
type ProductSearchOptions = { page?: number; limit?: number; stores?: StoreKey[] };
type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const SEARCH_CACHE_TTL_MS = 60_000;
const COMPARE_CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 100;
const DEFAULT_SEARCH_CANDIDATE_LIMIT = 320;
const DEFAULT_COMPARE_CANDIDATES_PER_ITEM = 160;
const MAX_SEARCH_CANDIDATE_LIMIT = 1_000;
const MAX_COMPARE_CANDIDATES_PER_ITEM = 600;

const searchCache = new Map<string, CacheEntry<Awaited<ReturnType<typeof searchDemoProductsPage>>>>();
const compareCache = new Map<string, CacheEntry<CompareResult>>();

function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL);
}

const unitMap: Record<ProductUnit, ApiProductUnit> = {
  GRAM: "g",
  KILOGRAM: "kg",
  MILLILITER: "ml",
  LITER: "l",
  UNIT: "un",
};

function mapSource(source: ProductSource) {
  return source === ProductSource.REAL ? "real" : "mock";
}

export function toApiProduct(row: ProductWithLatestPrice): Product | null {
  const latestPrice = row.priceHistory[0];

  if (!latestPrice || !storeKeys.includes(latestPrice.store.key as StoreKey)) {
    return null;
  }

  return {
    id: row.id,
    store: latestPrice.store.key as StoreKey,
    externalId: row.externalId ?? undefined,
    name: row.name,
    normalizedName: row.normalizedName,
    brand: row.brand ?? undefined,
    quantity: row.quantity?.toNumber(),
    unit: row.unit ? unitMap[row.unit] : undefined,
    packageText: row.packageText ?? undefined,
    price: latestPrice.price.toNumber(),
    originalPrice: latestPrice.originalPrice?.toNumber(),
    discountPercentage:
      latestPrice.originalPrice && latestPrice.originalPrice.greaterThan(latestPrice.price)
        ? Math.round(
            latestPrice.originalPrice
              .minus(latestPrice.price)
              .div(latestPrice.originalPrice)
              .mul(100)
              .toNumber()
          )
        : undefined,
    promotion: latestPrice.promotion,
    available: row.available,
    imageUrl: row.imageUrl ?? undefined,
    productUrl: row.productUrl ?? undefined,
    source: mapSource(row.source),
    updatedAt: latestPrice.observedAt.toISOString(),
  };
}

function promotionToApiProduct(row: PromotionWithRelations): Product | null {
  if (!storeKeys.includes(row.store.key as StoreKey)) {
    return null;
  }

  return {
    id: row.product.id,
    store: row.store.key as StoreKey,
    externalId: row.product.externalId ?? undefined,
    name: row.product.name,
    normalizedName: row.product.normalizedName,
    brand: row.product.brand ?? undefined,
    quantity: row.product.quantity?.toNumber(),
    unit: row.product.unit ? unitMap[row.product.unit] : undefined,
    packageText: row.product.packageText ?? undefined,
    price: row.price?.toNumber() ?? 0,
    originalPrice: row.originalPrice?.toNumber(),
    discountPercentage: row.discountPercentage ?? undefined,
    promotion: true,
    available: row.product.available,
    imageUrl: row.product.imageUrl ?? undefined,
    productUrl: row.product.productUrl ?? undefined,
    source: mapSource(row.source),
    updatedAt: row.startsAt?.toISOString() ?? row.updatedAt.toISOString(),
  };
}

export async function searchAllStores(query: string) {
  const result = await searchProductsPage(query);
  return result.products;
}

export async function searchProductsPage(
  query: string,
  options: ProductSearchOptions = {}
) {
  const startedAt = performance.now();
  const stores = normalizeStoreFilter(options.stores);
  const page = options.page ?? 1;
  const limit = options.limit ?? defaultProductSearchLimit;
  const cacheKey = productSearchCacheKey(query, { page, limit, stores });
  const cachedResult = readCache(searchCache, cacheKey);

  if (cachedResult) {
    logTiming("product search", startedAt, { query, stores, source: "cache" });
    return cachedResult;
  }

  if (!hasDatabaseConfig()) {
    const result = searchDemoProductsPage(query, { page, limit, stores });
    writeCache(searchCache, cacheKey, result, SEARCH_CACHE_TTL_MS);
    logTiming("product search", startedAt, { query, stores, source: "demo" });
    return result;
  }

  try {
    const products = await fetchProductCandidates(
      query,
      stores,
      getPositiveIntegerEnv(
        "PRODUCT_SEARCH_CANDIDATE_LIMIT",
        DEFAULT_SEARCH_CANDIDATE_LIMIT,
        MAX_SEARCH_CANDIDATE_LIMIT
      ),
      "search"
    );

    const mappedProducts = products.flatMap((product) => {
      const mapped = toApiProduct(product);
      return mapped ? [mapped] : [];
    });

    const result = paginateProducts(
      sortProductsBySearchRelevance(mappedProducts, query),
      page,
      limit
    );

    writeCache(searchCache, cacheKey, result, SEARCH_CACHE_TTL_MS);
    logTiming("product search", startedAt, {
      query,
      stores,
      source: "database",
      candidates: products.length,
      mapped: mappedProducts.length,
      total: result.total,
    });
    return result;
  } catch (error) {
    console.error("Falling back to demo product search:", error);
    const result = searchDemoProductsPage(query, { page, limit, stores });
    writeCache(searchCache, cacheKey, result, SEARCH_CACHE_TTL_MS);
    logTiming("product search", startedAt, { query, stores, source: "fallback" });
    return result;
  }
}

export async function getAllPromotions() {
  if (!hasDatabaseConfig()) {
    return demoProducts.filter((product) => product.available && product.promotion);
  }

  const promotions = await db.promotion.findMany({
    where: {
      active: true,
      product: { available: true },
    },
    orderBy: [{ discountPercentage: "desc" }, { updatedAt: "desc" }],
    take: 24,
    ...promotionWithRelations,
  });

  return promotions.flatMap((promotion) => {
    const mapped = promotionToApiProduct(promotion);
    return mapped ? [mapped] : [];
  });
}

export async function compareQueries(items: Array<{ query: string; quantity: number }>) {
  const startedAt = performance.now();
  const cacheKey = compareCacheKey(items);
  const cachedResult = readCache(compareCache, cacheKey);

  if (cachedResult) {
    logTiming("cart comparison", startedAt, { items: items.length, source: "cache" });
    return cachedResult;
  }

  if (!hasDatabaseConfig()) {
    const result = compareCartWithProducts(items, demoProducts);
    writeCache(compareCache, cacheKey, result, COMPARE_CACHE_TTL_MS);
    logTiming("cart comparison", startedAt, { items: items.length, source: "demo" });
    return result;
  }

  const productsByQuery = await Promise.all(
    items.map((item) =>
      fetchProductCandidates(
        item.query,
        storeKeys,
        getPositiveIntegerEnv(
          "COMPARE_CANDIDATES_PER_ITEM",
          DEFAULT_COMPARE_CANDIDATES_PER_ITEM,
          MAX_COMPARE_CANDIDATES_PER_ITEM
        ),
        "compare"
      )
    )
  );
  const products = dedupeProductRows(productsByQuery.flat());

  const mappedProducts = products.flatMap((product) => {
    const mapped = toApiProduct(product);
    return mapped ? [mapped] : [];
  });

  const result = compareCartWithProducts(items, mappedProducts);
  writeCache(compareCache, cacheKey, result, COMPARE_CACHE_TTL_MS);
  logTiming("cart comparison", startedAt, {
    items: items.length,
    source: "database",
    candidates: products.length,
    mapped: mappedProducts.length,
  });
  return result;
}

function searchDemoProductsPage(
  query: string,
  options: ProductSearchOptions = {}
) {
  const normalizedQuery = normalizeProductName(query);
  const queryTokens = productSearchTokens(query);
  const stores = normalizeStoreFilter(options.stores);
  const products = demoProducts.filter(
    (product) => {
      const productTokens = productSearchTokens(product.normalizedName || product.name);

      return (
        product.available &&
        stores.includes(product.store) &&
        (normalizeProductName(product.name).includes(normalizedQuery) ||
          normalizeProductName(product.normalizedName).includes(normalizedQuery) ||
          normalizeProductName(product.brand ?? "").includes(normalizedQuery) ||
          containsAllSearchTokens(productTokens, queryTokens))
      );
    }
  );

  return paginateProducts(
    sortProductsBySearchRelevance(products, query),
    options.page ?? 1,
    options.limit ?? defaultProductSearchLimit
  );
}

function compareCartWithProducts(items: Array<{ query: string; quantity: number }>, products: Product[]) {
  const productsByStore = storeKeys.reduce(
    (acc, store) => {
      acc[store] = [];
      return acc;
    },
    {} as Record<StoreKey, Product[]>
  );

  for (const product of products) {
    productsByStore[product.store].push(product);
  }

  return compareCart(items, productsByStore);
}

function normalizeStoreFilter(stores?: StoreKey[]) {
  const selectedStores = (stores ?? storeKeys).filter((store, index, values) =>
    storeKeys.includes(store) && values.indexOf(store) === index
  );

  return selectedStores.length > 0 ? selectedStores : [...storeKeys];
}

function productWithLatestPriceForStores(stores: readonly StoreKey[]) {
  const storeList = [...stores];

  return Prisma.validator<Prisma.ProductDefaultArgs>()({
    include: {
      priceHistory: {
        where: { store: { is: { key: { in: storeList } } } },
        orderBy: { observedAt: "desc" },
        take: 1,
        include: { store: true },
      },
    },
  });
}

async function fetchProductCandidates(
  query: string,
  stores: readonly StoreKey[],
  take: number,
  purpose: "search" | "compare"
) {
  const startedAt = performance.now();
  const products = await db.product.findMany({
    where: buildProductSearchWhere(query, stores),
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    take,
    ...productWithLatestPriceForStores(stores),
  });

  logTiming("product candidate query", startedAt, {
    query,
    stores,
    purpose,
    take,
    rows: products.length,
  });

  return products;
}

function dedupeProductRows(products: ProductWithLatestPrice[]) {
  return [...new Map(products.map((product) => [product.id, product])).values()];
}

function getPositiveIntegerEnv(name: string, fallback: number, max: number) {
  const value = Number(process.env[name]);

  if (!Number.isInteger(value) || value < 1) {
    return fallback;
  }

  return Math.min(value, max);
}

function productSearchCacheKey(
  query: string,
  options: Required<Pick<ProductSearchOptions, "page" | "limit">> & { stores: StoreKey[] }
) {
  return JSON.stringify({
    query: normalizeProductName(query),
    page: options.page,
    limit: options.limit,
    stores: [...options.stores].sort(),
  });
}

function compareCacheKey(items: Array<{ query: string; quantity: number }>) {
  return JSON.stringify(
    items.map((item) => ({
      query: normalizeProductName(item.query),
      quantity: item.quantity,
    }))
  );
}

function readCache<T>(cache: Map<string, CacheEntry<T>>, key: string) {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function writeCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  cache.set(key, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
}

function logTiming(label: string, startedAt: number, details: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  console.info(`${label} completed in ${Math.round(performance.now() - startedAt)}ms`, details);
}

function buildTokenSearchClause(query: string): Prisma.ProductWhereInput | null {
  const tokens = productSearchTokens(query);

  if (tokens.length === 0) {
    return null;
  }

  return {
    AND: tokens.map((token) => ({
      OR: productSearchTokenAlternatives(token).flatMap((alternative) => [
        { name: { contains: alternative, mode: "insensitive" } },
        { normalizedName: { contains: alternative, mode: "insensitive" } },
        { brand: { contains: alternative, mode: "insensitive" } },
      ]),
    })),
  };
}

function buildProductSearchWhere(query: string, stores: readonly StoreKey[]): Prisma.ProductWhereInput {
  const normalizedQuery = normalizeProductName(query);
  const tokenClause = buildTokenSearchClause(query);

  return {
    available: true,
    priceHistory: { some: { store: { is: { key: { in: [...stores] } } } } },
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { normalizedName: { contains: normalizedQuery, mode: "insensitive" } },
      { brand: { contains: query, mode: "insensitive" } },
      ...(tokenClause ? [tokenClause] : []),
    ],
  };
}
