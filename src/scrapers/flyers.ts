import { extractPackaging, inferBrand, normalizeProductName } from "@/lib/normalize-product";
import { persistScrapedProducts } from "@/lib/product-persistence";
import { Product, StoreKey } from "@/providers/types";

const BAHAMAS_FLYERS_URL = "https://bahamas.com.br/encartes/";
const BH_API_URL = "https://superbh.app/site-api";
const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_PDF_BYTES = 30 * 1024 * 1024;

type Flyer = {
  id: string;
  title: string;
  pdfUrl: string;
  description?: string;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type BhOption = {
  value: string;
  text: string;
};

type BhApiResponse<T> = {
  data?: T;
  isValid?: boolean;
  status?: string;
};

const cache = new Map<string, CacheEntry<unknown>>();
const pending = new Map<string, Promise<unknown>>();

function getCacheTtl() {
  const configuredMinutes = Number(process.env.FLYER_CACHE_MINUTES);
  return Number.isFinite(configuredMinutes) && configuredMinutes > 0
    ? configuredMinutes * 60 * 1000
    : DEFAULT_CACHE_TTL_MS;
}

async function withCache<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const cached = cache.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const running = pending.get(key) as Promise<T> | undefined;
  if (running) {
    return running;
  }

  const request = loader()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + getCacheTtl() });
      return value;
    })
    .catch((error) => {
      // A stale response is safer than replacing verified data during a temporary outage.
      if (cached) {
        return cached.value;
      }
      throw error;
    })
    .finally(() => pending.delete(key));

  pending.set(key, request);
  return request;
}

async function fetchPublic(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/json,application/pdf;q=0.9,*/*;q=0.8",
        "user-agent": "CotaI-Hackathon/1.0 (+public-flyer-reader)",
        ...init?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Falha ao consultar ${url}: HTTP ${response.status}`);
    }

    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetchPublic(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json() as Promise<T>;
}

async function extractPdfText(url: string) {
  const response = await fetchPublic(url);
  const data = new Uint8Array(await response.arrayBuffer());

  if (data.byteLength === 0 || data.byteLength > MAX_PDF_BYTES) {
    throw new Error(`PDF vazio ou acima do limite seguro: ${url}`);
  }

  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function parsePrice(value: string) {
  const normalized = value.replace(/\s/g, "").replace(/^R\$/i, "");
  if (!/^\d{1,3}(?:\.\d{3})*,\d{2}$/.test(normalized)) {
    return null;
  }

  const price = Number(normalized.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(price) && price > 0 ? price : null;
}

function parseBahamasPrice(value: string) {
  const match = value.match(/^R\$\s*(\d{1,3}(?:\.\d{3})*)\s*,\s*(\d{2})(?:\s|R\$|cada|quilo|$)/i);
  return match ? parsePrice(`${match[1]},${match[2]}`) : null;
}

function cleanLines(text: string) {
  return text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function isNoise(line: string) {
  const normalized = normalizeProductName(line);
  return (
    !normalized ||
    /^R\$(?:\s*\d+)?$/i.test(line) ||
    /^(cada|por|de|r|o quilo|quilo|kg)$/.test(normalized) ||
    /^-- \d+ of \d+ --$/.test(line) ||
    /^(mercearia|frios|laticinios|higiene|limpeza|bazar)(?:\s|,|&|$)/i.test(normalized) ||
    /^(ofertas validas|imagens meramente|fotos meramente|reservamo nos|garantimos a quantidade|e proibida a venda|a venda entrega|empresa varejista|apos o termino|incorretas por motivos|so atendendo|baixe ja|nos siga|informacoes ao consumidor|venha trabalhar)/i.test(
      normalized
    )
  );
}

function compactProductLines(lines: string[]) {
  const result: string[] = [];
  for (const line of lines.slice(-10)) {
    if (isNoise(line) || parsePrice(line) !== null) {
      continue;
    }
    if (normalizeProductName(result.at(-1) ?? "") !== normalizeProductName(line)) {
      result.push(line);
    }
  }
  return result;
}

function stripRepeatedProduct(lines: string[], previousProduct: Product | undefined) {
  if (!previousProduct) {
    return lines;
  }

  const previousTokens = new Set(previousProduct.normalizedName.split(" ").filter(Boolean));
  let start = 0;
  while (start < lines.length) {
    const tokens = normalizeProductName(lines[start]).split(" ").filter(Boolean);
    if (tokens.length === 0) {
      start += 1;
      continue;
    }
    const overlap = tokens.filter((token) => previousTokens.has(token)).length / tokens.length;
    if (overlap < 0.6) {
      break;
    }
    start += 1;
  }
  return lines.slice(start);
}

function titleCaseIfNeeded(value: string) {
  const letters = value.replace(/[^A-Za-zÀ-ÿ]/g, "");
  const uppercase = letters.replace(/[^A-ZÀ-Þ]/g, "").length;
  if (!letters || uppercase / letters.length < 0.8) {
    return value;
  }

  const lowercaseWords = new Set(["a", "as", "com", "da", "das", "de", "do", "dos", "e", "em", "ou", "para"]);
  return value
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((word, index) =>
      index > 0 && lowercaseWords.has(word)
        ? word
        : word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1)
    )
    .join(" ");
}

function hasConflictingCategories(name: string) {
  const normalized = normalizeProductName(name);
  const groups = [
    ["cerveja"],
    ["vinho"],
    ["frango", "coxinha das asas", "sobrecoxa"],
    ["acucar"],
    ["arroz"],
    ["cafe"],
    ["oleo"],
    ["leite"],
    ["maionese"],
    ["linguica"],
    ["fralda"],
  ];
  const matches = groups.filter((terms) => terms.some((term) => normalized.includes(term)));
  return matches.length > 1;
}

function isSuspiciousProductName(name: string) {
  const normalized = normalizeProductName(name);
  return (
    hasConflictingCategories(name) ||
    /(?:produtos anunciados|por loja|enquanto durarem|menores de 18|bahamas mix|empresa varejista)/.test(
      normalized
    ) ||
    /^chileno .+ cerveja/.test(normalized)
  );
}

function extractFlyerPackaging(name: string, soldByKg: boolean) {
  const parsed = extractPackaging(name);
  if (parsed.quantity && parsed.unit) {
    return parsed;
  }

  const units = normalizeProductName(name).match(/(?:leve|c)\s*(\d+)\s*(?:rolos|unidades|un)?\b/);
  if (units) {
    return { quantity: Number(units[1]), unit: "un" as const, packageText: `${units[1]}un` };
  }

  if (soldByKg || /\bkg\b/i.test(name)) {
    return { quantity: 1, unit: "kg" as const, packageText: "kg" };
  }

  return parsed;
}

function createProduct(input: {
  store: StoreKey;
  flyer: Flyer;
  lines: string[];
  price: number;
  originalPrice?: number;
  soldByKg: boolean;
  updatedAt: string;
}) {
  const productLines = compactProductLines(input.lines);
  if (productLines.length === 0) {
    return null;
  }

  const rawName = productLines.join(" ");
  const name = titleCaseIfNeeded(rawName);
  const normalizedName = normalizeProductName(name);
  if (
    normalizedName.length < 4 ||
    normalizedName.length > 220 ||
    isSuspiciousProductName(name)
  ) {
    return null;
  }

  const packaging = extractFlyerPackaging(name, input.soldByKg);
  const originalPrice =
    input.originalPrice && input.originalPrice > input.price ? input.originalPrice : undefined;
  const discountPercentage = originalPrice
    ? Math.round(((originalPrice - input.price) / originalPrice) * 100)
    : undefined;
  const identity = `${input.store}|${normalizedName}|${packaging.packageText ?? ""}|${input.flyer.id}`;

  return {
    id: `${input.store}-flyer-${stableHash(identity)}`,
    externalId: `${input.flyer.id}-${stableHash(identity)}`,
    store: input.store,
    name,
    normalizedName,
    brand: inferBrand(name),
    quantity: packaging.quantity,
    unit: packaging.unit,
    packageText: packaging.packageText,
    price: input.price,
    originalPrice,
    discountPercentage,
    promotion: true,
    available: true,
    productUrl: input.flyer.pdfUrl,
    source: "real",
    updatedAt: input.updatedAt,
  } satisfies Product;
}

export function parseBhFlyerText(text: string, flyer: Flyer, updatedAt = new Date().toISOString()) {
  const lines = cleanLines(text);
  const products: Product[] = [];

  for (let index = 0; index < lines.length - 3; index += 1) {
    const price = parsePrice(lines[index]);
    const originalPrice = parsePrice(lines[index + 1]);
    const saleUnit = normalizeProductName(lines[index + 2]);
    if (price === null || originalPrice === null || !/^(cada|o quilo|quilo)$/.test(saleUnit)) {
      continue;
    }

    let blockStart = Math.max(0, index - 10);
    for (let cursor = index - 1; cursor >= Math.max(0, index - 14); cursor -= 1) {
      if (normalizeProductName(lines[cursor]) === "de" || /^-- \d+ of \d+ --$/.test(lines[cursor])) {
        blockStart = cursor + 1;
        break;
      }
    }

    const product = createProduct({
      store: "bh",
      flyer,
      lines: lines.slice(blockStart, index),
      price,
      originalPrice,
      soldByKg: saleUnit.includes("quilo"),
      updatedAt,
    });
    if (product) {
      products.push(product);
    }
  }

  return dedupeProducts(products);
}

export function parseBahamasFlyerText(
  text: string,
  flyer: Flyer,
  updatedAt = new Date().toISOString()
) {
  const lines = cleanLines(text);
  const products: Product[] = [];
  let previousSaleUnit = -1;
  let previousProduct: Product | undefined;

  for (let index = 0; index < lines.length; index += 1) {
    if (!/^R\$/i.test(lines[index])) {
      continue;
    }

    const price = parseBahamasPrice(lines[index]);
    if (price === null) {
      continue;
    }

    let saleUnitIndex = /\b(cada|quilo)\b/i.test(lines[index]) ? index : -1;
    if (saleUnitIndex < 0) {
      for (let cursor = index + 1; cursor <= Math.min(lines.length - 1, index + 4); cursor += 1) {
        if (/^(cada|quilo|o quilo)$/.test(normalizeProductName(lines[cursor]))) {
          saleUnitIndex = cursor;
          break;
        }
      }
    }
    if (saleUnitIndex < 0) {
      continue;
    }

    let blockStart = Math.max(previousSaleUnit + 1, index - 10, 0);
    for (let cursor = index - 1; cursor >= Math.max(0, index - 14); cursor -= 1) {
      if (/^R\$(?:\s*\d+)?$/i.test(lines[cursor])) {
        blockStart = cursor + 1;
        break;
      }
    }

    const saleUnit = normalizeProductName(lines[saleUnitIndex]);
    const candidateLines = stripRepeatedProduct(lines.slice(blockStart, index), previousProduct);
    const product = createProduct({
      store: "bahamas",
      flyer,
      lines: candidateLines,
      price,
      soldByKg: saleUnit.includes("quilo"),
      updatedAt,
    });
    if (product) {
      products.push(product);
      previousSaleUnit = saleUnitIndex;
      previousProduct = product;
    }
  }

  return dedupeProducts(products);
}

function dedupeProducts(products: Product[]) {
  const unique = new Map<string, Product>();
  for (const product of products) {
    const key = `${product.normalizedName}|${product.packageText ?? ""}`;
    const current = unique.get(key);
    if (!current || product.price < current.price) {
      unique.set(key, product);
    }
  }
  return [...unique.values()];
}

async function extractFlyers(
  flyers: Flyer[],
  parser: (text: string, flyer: Flyer, updatedAt: string) => Product[]
) {
  const updatedAt = new Date().toISOString();
  const results = await Promise.allSettled(
    flyers.slice(0, 8).map(async (flyer) => {
      const text = await extractPdfText(flyer.pdfUrl);
      const products = parser(text, flyer, updatedAt);
      // Image-only or badly structured PDFs must not leak ambiguous data into comparisons.
      return products.length >= 3 ? products : [];
    })
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`Falha ao extrair o folheto público ${flyers[index]?.pdfUrl}:`, result.reason);
    }
  });

  return dedupeProducts(
    results.flatMap((result) => (result.status === "fulfilled" ? result.value : []))
  );
}

async function getBahamasFlyers() {
  const response = await fetchPublic(BAHAMAS_FLYERS_URL);
  const html = (await response.text()).replace(/\\\//g, "/");
  const urls = [...html.matchAll(/https:\/\/bahamas\.com\.br\/wp-content\/uploads\/[^"'<>\s]+\.pdf/gi)]
    .map((match) => match[0])
    .filter((url, index, all) => all.indexOf(url) === index);
  const region = (process.env.BAHAMAS_REGION ?? "zm").toLocaleLowerCase("pt-BR");
  const regionPattern = new RegExp(`(?:^|[-_/])${region}(?:[-_.]|$)`, "i");

  return urls
    .filter((url) => regionPattern.test(new URL(url).pathname))
    .map((pdfUrl) => {
      const fileName = decodeURIComponent(new URL(pdfUrl).pathname.split("/").at(-1) ?? pdfUrl);
      return {
        id: stableHash(pdfUrl),
        title: fileName.replace(/\.pdf$/i, "").replace(/[-_]+/g, " "),
        pdfUrl,
      } satisfies Flyer;
    });
}

async function getBhFlyers() {
  const city = process.env.BH_CITY ?? "Vicosa";
  const state = (process.env.BH_STATE ?? "MG").toUpperCase();
  const autocomplete = await fetchJson<BhApiResponse<{ options?: BhOption[] }>>(
    `${BH_API_URL}/api/autocomplete/cad-municipio`,
    { search: city, page: 0, view: 20, id: null }
  );
  const normalizedCity = normalizeProductName(city);
  const option = autocomplete.data?.options?.find((candidate) => {
    const normalizedText = normalizeProductName(candidate.text);
    return normalizedText.includes(normalizedCity) && candidate.value.toUpperCase().endsWith(`@${state}`);
  });

  if (!option) {
    throw new Error(`Município ${city}/${state} não encontrado no endpoint público do BH.`);
  }

  const response = await fetchJson<
    BhApiResponse<
      Array<{
        id: string;
        titulo?: string;
        tituloBotao?: string;
        folheto?: string;
        descricao?: string;
      }>
    >
  >(`${BH_API_URL}/api/mov-folheto/vigente`, { municipio: option });

  return (response.data ?? [])
    .filter((item): item is typeof item & { folheto: string } => Boolean(item.folheto))
    .map(
      (item) =>
        ({
          id: item.id,
          title: item.tituloBotao ?? item.titulo ?? "Folheto vigente Supermercados BH",
          pdfUrl: item.folheto,
          description: item.descricao,
        }) satisfies Flyer
    );
}

export async function scrapeBahamasFlyers() {
  return withCache("flyers:bahamas", async () => {
    const flyers = await getBahamasFlyers();
    if (flyers.length === 0) {
      throw new Error("A página oficial do Bahamas não retornou encartes da Zona da Mata.");
    }
    const products = await extractFlyers(flyers, parseBahamasFlyerText);
    if (products.length === 0) {
      throw new Error(`${flyers.length} encarte(s) do Bahamas foram encontrados, mas nenhum tinha texto seguro.`);
    }
    return persistScrapedProducts(products);
  });
}

export async function scrapeBhFlyers() {
  const city = process.env.BH_CITY ?? "Vicosa";
  const state = process.env.BH_STATE ?? "MG";
  return withCache(`flyers:bh:${city}:${state}`, async () => {
    const flyers = await getBhFlyers();
    if (flyers.length === 0) {
      throw new Error(`O endpoint oficial do BH não retornou folhetos vigentes para ${city}/${state}.`);
    }
    const products = await extractFlyers(flyers, parseBhFlyerText);
    if (products.length === 0) {
      throw new Error(`${flyers.length} folheto(s) do BH foram encontrados, mas nenhum tinha texto seguro.`);
    }
    return persistScrapedProducts(products);
  });
}

export function clearFlyerCache() {
  cache.clear();
}
