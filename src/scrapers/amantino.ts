import puppeteer, { Browser, LaunchOptions, Page } from "puppeteer";
import { existsSync } from "node:fs";
import { extractPackaging, inferBrand, normalizeProductName } from "@/lib/normalize-product";
import { persistScrapedProducts } from "@/lib/product-persistence";
import { createScraperProgress, withScraperRetry } from "@/lib/scraper-resilience";
import { Product } from "@/providers/types";

type ScrapeOptions = {
  query?: string;
  promotionsOnly?: boolean;
  limit?: number;
};

type ScrapeAllAmantinoOptions = {
  resume?: boolean;
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
const PRODUCT_LOAD_TIMEOUT_MS = 90_000;
const SCROLL_DELAY_MS = 2_500;

const querySeeds = [
  "Alimento-Infantil",
  "Azeite-E-Oleo-Composto",
  "Bebida-Alcoolica",
  "Bebida-Nao-Alcoolica",
  "Biscoito",
  "Bomboniere",
  "Carne",
  "Cereais",
  "Cerveja",
  "Congelado",
  "Conservas",
  "Descartável",
  "Emporio",
  "Frios-E-Laticinios",
  "Higiene-E-Beleza",
  "Hortifruti",
  "Inseticida-Repelente",
  "Limpeza",
  "Massas-E-Sopas",
  "Matinal",
  "Molhos-E-Temperos",
  "Naturais",
  "Oriental",
  "Padaria",
  "Papelaria",
  "Pet-Shop",
  "Po-Para-Preparos",
  "Produto-Amantino",
  "Sobremesas",
  "Utilidade",
];

const cache = new Map<string, { expiresAt: number; products: Product[] }>();

export async function scrapeAmantinoProducts(options: ScrapeOptions = {}) {
  const key = JSON.stringify(options);
  const cached = cache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.products;
  }

  return withBrowser((browser) => scrapeAmantinoProductsWithBrowser(browser, options, key));
}

export async function scrapeAllAmantinoSeededProducts(options: ScrapeAllAmantinoOptions = {}) {
  return withBrowser(async (browser) => {
    const allProducts: Product[] = [];
    const progress = await createScraperProgress("amantino", { resume: options.resume });

    console.log(`Amantino: scraper progress state at ${progress.statePath}`);

    for (let index = 0; index < querySeeds.length; index += 1) {
      const query = querySeeds[index];
      const categoryKey = query;
      console.log(`Amantino: scraping category ${index + 1}/${querySeeds.length}: ${query}`);

      if (progress.isCompleted(categoryKey)) {
        console.log(`Amantino: skipping completed category ${query}.`);
        continue;
      }

      await progress.startCategory(categoryKey, query, index + 1, querySeeds.length);

      try {
        const key = JSON.stringify({ query, limit: 40 });
        const products = await withScraperRetry(`Amantino category ${query}`, () =>
          scrapeAmantinoProductsWithBrowser(browser, { query, limit: 40 }, key)
        );
        allProducts.push(...products);
        await progress.succeedCategory(categoryKey, query, products.length);
      } catch (error) {
        console.error(`Amantino: failed category ${query}:`, error);
        await progress.failCategory(categoryKey, query, error);
      }
    }

    return dedupeProducts(allProducts);
  });
}

async function scrapeAmantinoProductsWithBrowser(
  browser: Browser,
  options: ScrapeOptions,
  key: string
) {
  const cached = cache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.products;
  }

  const page = await browser.newPage();

  try {
    const url = buildAmantinoUrl(options);
    console.log(`Amantino: opening ${url}`);
    await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 1 });
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: PRODUCT_LOAD_TIMEOUT_MS,
    });

    console.log("Amantino: waiting for product cards...");
    await waitForProductCards(page);
    console.log("Amantino: product cards detected.");

    await autoScrollProductList(page, options.limit ?? DEFAULT_LIMIT);

    console.log("Amantino: extracting product cards from DOM...");
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

    console.log(`Amantino: extracted ${rawCards.length} raw card(s).`);
    const products = normalizeAmantinoCards(rawCards, Boolean(options.promotionsOnly));
    console.log(`Amantino: normalized ${products.length} product(s), persisting to database...`);
    const savedProducts = await persistScrapedProducts(products);
    console.log(`Amantino: persisted ${savedProducts.length} product(s).`);
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, products: savedProducts });
    return savedProducts;
  } finally {
    await page.close();
  }
}

function buildAmantinoUrl(options: ScrapeOptions) {
  if (options.promotionsOnly) {
    return `${AMANTINO_BASE_URL}?Promocoes`;
  }

  if (options.query?.trim()) {
    return `${AMANTINO_BASE_URL}?Categoria=${encodeURIComponent(options.query.trim())}`;
  }

  return AMANTINO_BASE_URL;
}

async function autoScrollProductList(page: Page, limit: number) {
  let previousCount = 0;
  let stableRounds = 0;

  while (stableRounds < 4) {
    const currentCount = await page.evaluate(() => {
      const container = document.querySelector("#CRDPRODUTOSFRAPRODUTOS");
      return container?.querySelectorAll("li.cardorion h5").length ?? 0;
    });

    console.log(`Amantino: product list currently has ${currentCount} card(s).`);

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
        container.dispatchEvent(new Event("scroll", { bubbles: true }));
      }
    });

    await waitForProductCountChange(page, currentCount, SCROLL_DELAY_MS);
  }
}

async function waitForProductCards(page: Page) {
  await page.waitForFunction(
    () => {
      const container = document.querySelector("#CRDPRODUTOSFRAPRODUTOS");
      if (!container) {
        return false;
      }

      const cards = Array.from(container.querySelectorAll("li.cardorion"));
      return cards.some((card) => {
        const name = card.querySelector("h5")?.textContent?.trim();
        const text = card.textContent ?? "";
        return Boolean(name) && /R\$\s*[\d.,]+/.test(text);
      });
    },
    { timeout: PRODUCT_LOAD_TIMEOUT_MS }
  );
}

async function waitForProductCountChange(page: Page, previousCount: number, timeoutMs: number) {
  try {
    await page.waitForFunction(
      (count) =>
        document.querySelectorAll("#CRDPRODUTOSFRAPRODUTOS li.cardorion h5").length > count,
      { timeout: timeoutMs },
      previousCount
    );
  } catch {
    await new Promise((resolve) => setTimeout(resolve, timeoutMs));
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
  try {
    // Let Puppeteer find its own installed browser automatically
    return puppeteer.executablePath();
  } catch (e) {
    const candidates = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      "/usr/bin/google-chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
}
