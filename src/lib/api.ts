import { Prisma, ProductSource, ProductUnit } from "@prisma/client";
import { compareCart } from "@/lib/compare-cart";
import db from "@/lib/db";
import { normalizeProductName } from "@/lib/normalize-product";
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
  const normalizedQuery = normalizeProductName(query);

  const products = await db.product.findMany({
    where: {
      available: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { normalizedName: { contains: normalizedQuery, mode: "insensitive" } },
        { brand: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: 32,
    ...productWithLatestPrice,
  });

  return products.flatMap((product) => {
    const mapped = toApiProduct(product);
    return mapped ? [mapped] : [];
  });
}

export async function getAllPromotions() {
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
  const products = await db.product.findMany({
    where: { available: true },
    orderBy: { name: "asc" },
    ...productWithLatestPrice,
  });

  const productsByStore = storeKeys.reduce(
    (acc, store) => {
      acc[store] = [];
      return acc;
    },
    {} as Record<StoreKey, Product[]>
  );

  for (const product of products) {
    const mapped = toApiProduct(product);
    if (mapped) {
      productsByStore[mapped.store].push(mapped);
    }
  }

  return compareCart(items, productsByStore);
}
