import puppeteer, { Browser, LaunchOptions, Page } from "puppeteer";
import { existsSync } from "node:fs";
import { extractPackaging, inferBrand, normalizeProductName } from "@/lib/normalize-product";
import { Product } from "@/providers/types";

type ScrapeOptions = {
  query?: string;
  promotionsOnly?: boolean;
  limit?: number;
};

type RawCard = {
  externalId?: string;
  imageUrl?: string;
  name: string;
  priceText: string[];
  promotion: boolean;
};

type NormalizedCard = Product;

const DEFAULT_LIMIT = 60;
const AMANTINO_BASE_URL = "https://amantino.marketmine.com.br/principal";
const CACHE_TTL_MS = 1000 * 60 * 10;

const querySeeds = [
  "arroz",
  "feijao",
  "oleo",
  "leite",
  "acucar",
  "cafe",
  "farinha",
  "macarrao",
  "manteiga",
  "queijo",
  "presunto",
  "pao",
  "refrigerante",
  "suco",
  "agua",
  "carne",
  "frango",
  "linguica",
  "tomate",
  "batata",
  "cebola",
  "alface",
  "detergente",
  "sabao",
  "papel",
];

const cache = new Map<string, { expiresAt: number; products: Product[] }>();

export async function scrapeAmantinoProducts(options: ScrapeOptions = {}) {
  const key = JSON.stringify(options);
  const cached = cache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.products;
  }

  const products = await withBrowser(async (browser) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(buildAmantinoUrl(options), {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await page.waitForFunction(
      () => {
        const list = document.querySelector("#CRDPRODUTOSFRAPRODUTOS");
        const titles = Array.from(document.querySelectorAll("h5")).filter(
          (heading) => (heading.textContent ?? "").trim().length > 0
        );
        return Boolean(list) && titles.length > 1;
      },
      { timeout: 60_000 }
    );

    await autoScrollProductList(page, options.limit ?? DEFAULT_LIMIT);

    const rawCards = await page.evaluate(() => {
      const container = document.querySelector("#CRDPRODUTOSFRAPRODUTOS");
      if (!container) {
        return [] as RawCard[];
      }

      const cardNodes = Array.from(container.querySelectorAll("li.cardorion"));

      return cardNodes
        .map((card) => {
          const name =
            card.querySelector("h5")?.textContent?.trim().replace(/\s+/g, " ") ?? "";
          const paragraphs = Array.from(card.querySelectorAll("p"))
            .map((node) => node.textContent?.trim().replace(/\s+/g, " "))
            .filter((value): value is string => Boolean(value));
          const image = card.querySelector("img");
          const promoText = card.textContent?.toLowerCase().includes("promoção") ?? false;

          return {
            externalId: image?.getAttribute("alt") ?? undefined,
            imageUrl: image?.getAttribute("src") ?? undefined,
            name,
            priceText: paragraphs,
            promotion: promoText || paragraphs.some((value) => value.match(/R\$/g)?.length === 2),
          };
        })
        .filter((card) => card.name.length > 0);
    });

    await page.close();

    return normalizeAmantinoCards(rawCards, Boolean(options.promotionsOnly));
  });

  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, products });
  return products;
}

export async function scrapeAllAmantinoSeededProducts() {
  const allResults = await Promise.all(
    querySeeds.map((query) => scrapeAmantinoProducts({ query, limit: 40 }))
  );

  return dedupeProducts(allResults.flat());
}

function buildAmantinoUrl(options: ScrapeOptions) {
  if (options.promotionsOnly) {
    return `${AMANTINO_BASE_URL}?Promocoes`;
  }

  if (options.query?.trim()) {
    return `${AMANTINO_BASE_URL}?Produto=${encodeURIComponent(options.query.trim())}`;
  }

  return AMANTINO_BASE_URL;
}

async function autoScrollProductList(page: Page, limit: number) {
  let previousCount = 0;
  let stableRounds = 0;

  while (stableRounds < 3) {
    const currentCount = await page.evaluate(() => {
      const container = document.querySelector("#CRDPRODUTOSFRAPRODUTOS");
      return container?.querySelectorAll("li.cardorion h5").length ?? 0;
    });

    if (currentCount >= limit) {
      break;
    }

    if (currentCount === previousCount) {
      stableRounds += 1;
    } else {
      stableRounds = 0;
      previousCount = currentCount;
    }

    await page.evaluate(() => {
      const container = document.querySelector("#CRDPRODUTOSFRAPRODUTOS");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
}

function normalizeAmantinoCards(cards: RawCard[], promotionsOnly: boolean): NormalizedCard[] {
  const updatedAt = new Date().toISOString();
  const normalizedProducts = cards
    .map((card) => {
      const priceValues = extractPrices(card.priceText.join(" "));
      const currentPrice = card.promotion && priceValues.length > 1 ? priceValues[1] : priceValues[0];
      const originalPrice = card.promotion && priceValues.length > 1 ? priceValues[0] : undefined;

      if (!currentPrice) {
        return null;
      }

      const packaging = extractPackaging(card.name);
      const brand = inferBrand(card.name);

      const normalizedProduct = {
        id: `amantino-real-${card.externalId ?? normalizeProductName(card.name)}`,
        store: "amantino" as const,
        externalId: card.externalId,
        name: card.name,
        normalizedName: normalizeProductName(card.name),
        brand,
        quantity: packaging.quantity,
        unit: packaging.unit,
        packageText: packaging.packageText,
        price: currentPrice,
        originalPrice,
        discountPercentage:
          originalPrice && originalPrice > currentPrice
            ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
            : undefined,
        promotion: Boolean(originalPrice && originalPrice > currentPrice),
        available: true,
        imageUrl: card.imageUrl,
        productUrl: promotionsOnly ? `${AMANTINO_BASE_URL}?Promocoes` : AMANTINO_BASE_URL,
        source: "real" as const,
        updatedAt,
      } satisfies Product;

      if (promotionsOnly && !normalizedProduct.promotion) {
        return null;
      }

      return normalizedProduct;
    })
    .filter(isDefined);

  return dedupeProducts(normalizedProducts);
}

function extractPrices(text: string) {
  return [...text.matchAll(/R\$\s*([\d.,]+)/g)].map((match) =>
    Number(match[1].replace(/\./g, "").replace(",", "."))
  );
}

function dedupeProducts(products: Product[]) {
  const map = new Map<string, Product>();

  for (const product of products) {
    const key = `${product.normalizedName}-${product.packageText ?? ""}`;
    if (!map.has(key)) {
      map.set(key, product);
    }
  }

  return [...map.values()];
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value != null;
}

async function withBrowser<T>(callback: (browser: Browser) => Promise<T>) {
  const browser = await puppeteer.launch(getLaunchOptions());

  try {
    return await callback(browser);
  } finally {
    await browser.close();
  }
}

function getLaunchOptions(): LaunchOptions {
  return {
    headless: true,
    executablePath: resolveChromeExecutablePath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
}

function resolveChromeExecutablePath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
