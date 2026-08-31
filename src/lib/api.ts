import { Prisma, ProductSource, ProductUnit } from "@prisma/client";
import { demoProducts } from "@/data/demo-products";
import { compareCart } from "@/lib/compare-cart";
import db from "@/lib/db";
import { normalizeProductName } from "@/lib/normalize-product";
import {
  containsAllSearchTokens,
  defaultProductSearchLimit,
  paginateProducts,
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
  if (!hasDatabaseConfig()) {
    return searchDemoProductsPage(query, options);
  }

  const normalizedQuery = normalizeProductName(query);
  const stores = normalizeStoreFilter(options.stores);

  try {
    const products = await db.product.findMany({
      where: buildProductSearchWhere(query, stores),
      orderBy: { name: "asc" },
      ...productWithLatestPriceForStores(stores),
    });

    const mappedProducts = products.flatMap((product) => {
      const mapped = toApiProduct(product);
      return mapped ? [mapped] : [];
    });

    return paginateProducts(
      sortProductsBySearchRelevance(mappedProducts, query),
      options.page ?? 1,
      options.limit ?? defaultProductSearchLimit
    );
  } catch (error) {
    console.error("Falling back to demo product search:", error);
    return searchDemoProductsPage(query, options);
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
  if (!hasDatabaseConfig()) {
    return compareCartWithProducts(items, demoProducts);
  }

  const products = await db.product.findMany({
    where: buildProductSearchWhereForQueries(items.map((item) => item.query), storeKeys),
    orderBy: { name: "asc" },
    ...productWithLatestPriceForStores(storeKeys),
  });

  const mappedProducts = products.flatMap((product) => {
    const mapped = toApiProduct(product);
    return mapped ? [mapped] : [];
  });

  return compareCartWithProducts(items, mappedProducts);
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

function buildTokenSearchClause(query: string): Prisma.ProductWhereInput | null {
  const tokens = productSearchTokens(query);

  if (tokens.length === 0) {
    return null;
  }

  return {
    AND: tokens.map((token) => ({
      OR: [
        { name: { contains: token, mode: "insensitive" } },
        { normalizedName: { contains: token, mode: "insensitive" } },
        { brand: { contains: token, mode: "insensitive" } },
      ],
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

function buildProductSearchWhereForQueries(queries: string[], stores: readonly StoreKey[]): Prisma.ProductWhereInput {
  const clauses = queries
    .map((query) => buildProductSearchWhere(query, stores).OR)
    .flat()
    .filter(Boolean) as Prisma.ProductWhereInput[];

  return {
    available: true,
    priceHistory: { some: { store: { is: { key: { in: [...stores] } } } } },
    ...(clauses.length > 0 ? { OR: clauses } : {}),
  };
}
