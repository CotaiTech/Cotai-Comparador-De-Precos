import { Prisma, ProductSource, ProductUnit, StandardUnit } from "@prisma/client";
import db from "@/lib/db";
import {
  getNormalizedPackageText,
  getNormalizedProductName,
} from "@/lib/normalize-product";
import { storeMeta } from "@/lib/store";
import { Product, StoreKey } from "@/providers/types";

const productUnitMap: Record<NonNullable<Product["unit"]>, ProductUnit> = {
  g: ProductUnit.GRAM,
  kg: ProductUnit.KILOGRAM,
  ml: ProductUnit.MILLILITER,
  l: ProductUnit.LITER,
  un: ProductUnit.UNIT,
};

const storeWebsiteUrls: Record<StoreKey, string> = {
  escola: "https://supermercadoescola.org.br/",
  amantino: "https://amantino.marketmine.com.br/principal",
  bh: "https://superbh.app/",
  bahamas: "https://bahamas.com.br/",
};

const DEFAULT_DB_BATCH_SIZE = 1;

function getDbBatchSize() {
  const value = Number(process.env.SCRAPER_DB_BATCH_SIZE);
  if (!Number.isInteger(value) || value < 1) {
    return DEFAULT_DB_BATCH_SIZE;
  }

  return value;
}

function mapSource(source: Product["source"]) {
  return source === "real" ? ProductSource.REAL : ProductSource.MOCK;
}

function mapUnit(unit?: Product["unit"]) {
  return unit ? productUnitMap[unit] : undefined;
}

function canonicalizeProduct(product: Product): Product {
  return {
    ...product,
    normalizedName: getNormalizedProductName(product),
    packageText: getNormalizedPackageText(product.packageText) ?? product.packageText,
    brand: product.brand ? getNormalizedProductName(product.brand) : undefined,
  };
}

function standardizeQuantity(product: Product) {
  if (!product.quantity || !product.unit) {
    return {
      standardizedQuantity: undefined,
      standardizedUnit: undefined,
    };
  }

  if (product.unit === "kg") {
    return {
      standardizedQuantity: product.quantity * 1000,
      standardizedUnit: StandardUnit.GRAM,
    };
  }

  if (product.unit === "g") {
    return {
      standardizedQuantity: product.quantity,
      standardizedUnit: StandardUnit.GRAM,
    };
  }

  if (product.unit === "l") {
    return {
      standardizedQuantity: product.quantity * 1000,
      standardizedUnit: StandardUnit.MILLILITER,
    };
  }

  if (product.unit === "ml") {
    return {
      standardizedQuantity: product.quantity,
      standardizedUnit: StandardUnit.MILLILITER,
    };
  }

  return {
    standardizedQuantity: product.quantity,
    standardizedUnit: StandardUnit.UNIT,
  };
}

function productPayload(product: Product): Prisma.ProductUncheckedCreateInput {
  const { standardizedQuantity, standardizedUnit } = standardizeQuantity(product);

  return {
    id: product.id,
    externalId: product.externalId,
    name: product.name,
    normalizedName: product.normalizedName,
    brand: product.brand,
    packageText: product.packageText,
    quantity: product.quantity,
    unit: mapUnit(product.unit),
    standardizedQuantity,
    standardizedUnit,
    imageUrl: product.imageUrl,
    productUrl: product.productUrl,
    source: mapSource(product.source),
    available: product.available,
  };
}

function productUpdatePayload(product: Product): Prisma.ProductUncheckedUpdateInput {
  const { id: _id, ...payload } = productPayload(product);
  return payload;
}

async function findExistingProduct(product: Product, storeId: string) {
  const normalizedName = getNormalizedProductName(product);
  const packageText = getNormalizedPackageText(product.packageText) ?? product.packageText;

  return db.product.findFirst({
    where: {
      OR: [
        { id: product.id },
        product.externalId
          ? {
              externalId: product.externalId,
              priceHistory: { some: { storeId } },
            }
          : undefined,
        {
          normalizedName,
          packageText,
          priceHistory: { some: { storeId } },
        },
      ].filter(Boolean) as Prisma.ProductWhereInput[],
    },
  });
}

async function findExistingProducts(products: Product[], storeId: string) {
  const ids = products.map((product) => product.id);
  const externalIds = products
    .map((product) => product.externalId)
    .filter((externalId): externalId is string => Boolean(externalId));
  const identityFilters = products.map((product) => ({
    normalizedName: getNormalizedProductName(product),
    packageText: getNormalizedPackageText(product.packageText) ?? product.packageText,
    priceHistory: { some: { storeId } },
  }));

  return db.product.findMany({
    where: {
      OR: [
        ids.length > 0 ? { id: { in: ids } } : undefined,
        externalIds.length > 0
          ? {
              externalId: { in: externalIds },
              priceHistory: { some: { storeId } },
            }
          : undefined,
        ...identityFilters,
      ].filter(Boolean) as Prisma.ProductWhereInput[],
    },
    include: {
      priceHistory: {
        where: { storeId },
        take: 1,
      },
    },
  });
}

function productIdentityKey(product: Product) {
  return `${getNormalizedProductName(product)}|${getNormalizedPackageText(product.packageText) ?? product.packageText ?? ""}`;
}

function dedupeProductsForPersistence(products: Product[]) {
  const deduped = new Map<string, Product>();

  for (const product of products) {
    const key = `${product.store}|${product.externalId ?? productIdentityKey(product)}`;
    deduped.set(key, product);
  }

  return [...deduped.values()];
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableDbError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ["P1001", "P1002", "P1017"].includes(error.code)
  );
}

async function withDbRetry<T>(label: string, operation: () => Promise<T>) {
  const maxAttempts = 8;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableDbError(error) || attempt === maxAttempts) {
        throw error;
      }

      const waitMs = Math.min(30000, 1000 * 2 ** (attempt - 1));
      console.warn(
        `Database connection failed during ${label}; retrying in ${waitMs}ms ` +
          `(${attempt}/${maxAttempts})...`
      );
      await delay(waitMs);
    }
  }

  throw new Error(`Database retry loop exhausted during ${label}.`);
}

export async function persistScrapedProducts(products: Product[]) {
  const savedProducts: Product[] = [];
  const canonicalProducts = dedupeProductsForPersistence(products.map(canonicalizeProduct));
  const productsByStore = new Map<StoreKey, Product[]>();
  const dbBatchSize = getDbBatchSize();

  for (const product of canonicalProducts) {
    productsByStore.set(product.store, [...(productsByStore.get(product.store) ?? []), product]);
  }

  for (const [storeKey, storeProducts] of productsByStore) {
    const store = await withDbRetry(`store upsert for ${storeKey}`, () =>
      db.store.upsert({
        where: { key: storeKey },
        update: {
          name: storeMeta[storeKey].label,
          slug: storeKey,
          websiteUrl: storeWebsiteUrls[storeKey],
        },
        create: {
          key: storeKey,
          name: storeMeta[storeKey].label,
          slug: storeKey,
          websiteUrl: storeWebsiteUrls[storeKey],
        },
      })
    );

    const existingProducts = await withDbRetry(`existing product lookup for ${storeKey}`, () =>
      findExistingProducts(storeProducts, store.id)
    );
    const existingById = new Map(existingProducts.map((product) => [product.id, product]));
    const existingByExternalId = new Map(
      existingProducts
        .filter((product) => product.externalId)
        .map((product) => [product.externalId!, product])
    );
    const existingByIdentity = new Map(
      existingProducts.map((product) => [
        `${getNormalizedProductName(product)}|${getNormalizedPackageText(product.packageText) ?? product.packageText ?? ""}`,
        product,
      ])
    );

    const resolvedProducts = storeProducts.map((product) => ({
      product,
      existing:
        existingById.get(product.id) ??
        (product.externalId ? existingByExternalId.get(product.externalId) : undefined) ??
        existingByIdentity.get(productIdentityKey(product)),
    }));

    const persistedByInputId = new Map<string, string>();

    for (const batch of chunk(resolvedProducts, dbBatchSize)) {
      const dbProducts = await Promise.all(
        batch.map(({ product, existing }) =>
          withDbRetry(`product upsert for ${product.name}`, () =>
            db.product.upsert({
              where: { id: existing?.id ?? product.id },
              update: productUpdatePayload(product),
              create: productPayload(product),
            })
          )
        )
      );

      dbProducts.forEach((dbProduct, index) => {
        persistedByInputId.set(batch[index].product.id, dbProduct.id);
      });
    }

    await withDbRetry(`price history insert for ${storeKey}`, () =>
      db.priceHistory.createMany({
        data: storeProducts.map((product) => ({
          productId: persistedByInputId.get(product.id) ?? product.id,
          storeId: store.id,
          price: product.price,
          originalPrice: product.originalPrice,
          promotion: product.promotion,
          source: mapSource(product.source),
          observedAt: new Date(product.updatedAt),
        })),
        skipDuplicates: true,
      })
    );

    const persistedProductIds = [
      ...new Set(
        storeProducts.map((product) => persistedByInputId.get(product.id) ?? product.id)
      ),
    ];

    await withDbRetry(`promotion cleanup for ${storeKey}`, () =>
      db.promotion.deleteMany({
        where: {
          productId: { in: persistedProductIds },
          storeId: store.id,
        },
      })
    );

    const promotions = storeProducts.filter((product) => product.promotion);

    if (promotions.length > 0) {
      await withDbRetry(`promotion insert for ${storeKey}`, () =>
        db.promotion.createMany({
          data: promotions.map((product) => ({
            productId: persistedByInputId.get(product.id) ?? product.id,
            storeId: store.id,
            title: product.name,
            price: product.price,
            originalPrice: product.originalPrice,
            discountPercentage: product.discountPercentage,
            active: true,
            sourceUrl: product.productUrl,
            source: mapSource(product.source),
            startsAt: new Date(product.updatedAt),
          })),
        })
      );
    }

    savedProducts.push(
      ...storeProducts.map((product) => ({
        ...product,
        id: persistedByInputId.get(product.id) ?? product.id,
      }))
    );
  }

  return savedProducts;
}
