import { PrismaClient, ProductSource, ProductUnit, StandardUnit } from "@prisma/client";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env")) {
  loadEnvFile(".env");
}

const prisma = new PrismaClient();

type SeedProduct = {
  id: string;
  store: "escola" | "amantino" | "bh" | "bahamas";
  externalId?: string;
  name: string;
  normalizedName: string;
  brand?: string;
  quantity?: number;
  unit?: "g" | "kg" | "ml" | "l" | "un";
  packageText?: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  promotion: boolean;
  available: boolean;
  imageUrl?: string;
  productUrl?: string;
  source: "real" | "mock";
  updatedAt: string;
};

const products: SeedProduct[] = [
  {
    id: "escola-real-manteiga-vicosa-500g",
    store: "escola",
    externalId: "manteiga-vicosa-500g",
    name: "Manteiga Viçosa 500g",
    normalizedName: "manteiga vicosa 500 g",
    brand: "Viçosa",
    quantity: 500,
    unit: "g",
    packageText: "500g",
    price: 18.9,
    originalPrice: 22.9,
    discountPercentage: 17,
    promotion: true,
    available: true,
    imageUrl: "https://supermercadoescola.org.br/media/catalog/product/cache/placeholder/image.jpg",
    productUrl: "https://supermercadoescola.org.br/",
    source: "real",
    updatedAt: "2026-08-22T14:32:00.000Z",
  },
  {
    id: "escola-real-requeijao-vicosa-400g",
    store: "escola",
    externalId: "requeijao-vicosa-400g",
    name: "Requeijão Viçosa Cremoso Pote 400g",
    normalizedName: "requeijao vicosa cremoso pote 400 g",
    brand: "Viçosa",
    quantity: 400,
    unit: "g",
    packageText: "400g",
    price: 14.89,
    originalPrice: 16.89,
    discountPercentage: 12,
    promotion: true,
    available: true,
    productUrl: "https://supermercadoescola.org.br/",
    source: "real",
    updatedAt: "2026-08-22T14:32:00.000Z",
  },
  {
    id: "escola-real-creme-ricota-vicosa-200g",
    store: "escola",
    name: "Creme de Ricota Viçosa Pote 200g",
    normalizedName: "creme de ricota vicosa pote 200 g",
    brand: "Viçosa",
    quantity: 200,
    unit: "g",
    packageText: "200g",
    price: 5.9,
    promotion: false,
    available: true,
    productUrl: "https://supermercadoescola.org.br/",
    source: "real",
    updatedAt: "2026-08-22T14:32:00.000Z",
  },
  {
    id: "escola-real-doce-leite-vicosa-400g",
    store: "escola",
    name: "Doce de Leite Viçosa Tradicional 400g",
    normalizedName: "doce de leite vicosa tradicional 400 g",
    brand: "Viçosa",
    quantity: 400,
    unit: "g",
    packageText: "400g",
    price: 23.9,
    promotion: false,
    available: true,
    productUrl: "https://supermercadoescola.org.br/",
    source: "real",
    updatedAt: "2026-08-22T14:32:00.000Z",
  },
  {
    id: "escola-real-leite-vicosa-1l",
    store: "escola",
    name: "Leite Viçosa Tipo C 1L",
    normalizedName: "leite vicosa tipo c 1 l",
    brand: "Viçosa",
    quantity: 1,
    unit: "l",
    packageText: "1L",
    price: 4.99,
    promotion: false,
    available: true,
    productUrl: "https://supermercadoescola.org.br/categoria/produtos-vi-osa",
    source: "real",
    updatedAt: "2026-08-22T14:32:00.000Z",
  },
];

const storeNames: Record<SeedProduct["store"], string> = {
  escola: "Supermercado Escola",
  amantino: "Amantino",
  bh: "Supermercados BH",
  bahamas: "Bahamas",
};

const unitMap: Record<string, ProductUnit> = {
  g: ProductUnit.GRAM,
  kg: ProductUnit.KILOGRAM,
  ml: ProductUnit.MILLILITER,
  l: ProductUnit.LITER,
  un: ProductUnit.UNIT,
};

function mapSource(source: SeedProduct["source"]) {
  return source === "real" ? ProductSource.REAL : ProductSource.MOCK;
}

function mapUnit(unit?: SeedProduct["unit"]) {
  return unit ? unitMap[unit] : undefined;
}

function standardizeQuantity(product: SeedProduct) {
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

async function main() {
  const stores = await Promise.all(
    Object.entries(storeNames).map(([key, name]) =>
      prisma.store.upsert({
        where: { key },
        update: { name, slug: key },
        create: { key, name, slug: key },
      })
    )
  );
  const storesByKey = new Map(stores.map((store) => [store.key, store]));
  const productIds = products.map((product) => product.id);

  await prisma.promotion.deleteMany({
    where: {
      productId: { in: productIds },
    },
  });

  for (const product of products) {
    const store = storesByKey.get(product.store);

    if (!store) {
      throw new Error(`Unknown store key: ${product.store}`);
    }

    const source = mapSource(product.source);
    const observedAt = new Date(product.updatedAt);
    const { standardizedQuantity, standardizedUnit } = standardizeQuantity(product);

    const dbProduct = await prisma.product.upsert({
      where: { id: product.id },
      update: {
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
        source,
        available: product.available,
      },
      create: {
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
        source,
        available: product.available,
      },
    });

    await prisma.priceHistory.createMany({
      data: [
        {
          productId: dbProduct.id,
          storeId: store.id,
          price: product.price,
          originalPrice: product.originalPrice,
          promotion: product.promotion,
          source,
          observedAt,
        },
      ],
      skipDuplicates: true,
    });

    if (product.promotion) {
      await prisma.promotion.create({
        data: {
          productId: dbProduct.id,
          storeId: store.id,
          title: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          discountPercentage: product.discountPercentage,
          active: true,
          sourceUrl: product.productUrl,
          source,
          startsAt: observedAt,
        },
      });
    }
  }

  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
