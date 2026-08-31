const accentRegex = /[\u0300-\u036f]/g;

const unitMap: Record<string, string> = {
  litros: "l",
  litro: "l",
  lt: "l",
  lts: "l",
  ml: "ml",
  mililitros: "ml",
  mililitro: "ml",
  quilos: "kg",
  quilo: "kg",
  kilo: "kg",
  kilos: "kg",
  kg: "kg",
  gramas: "g",
  grama: "g",
  gr: "g",
  g: "g",
  unidades: "un",
  unidade: "un",
  und: "un",
  unid: "un",
};

export type ParsedPackaging = {
  quantity?: number;
  unit?: "g" | "kg" | "ml" | "l" | "un";
  packageText?: string;
};

export type NormalizedProductIdentityInput = {
  name: string;
  normalizedName?: string | null;
  packageText?: string | null;
};

export type ExtractedProductMeasure = {
  quantity: number;
  unit: "g" | "kg" | "ml" | "l";
  standardizedQuantity: number;
  standardizedUnit: "kg" | "l";
  packageText: string;
};

export type StandardizedPricePerUnit = {
  value: number;
  unit: "kg" | "l";
  quantity: number;
  sourceQuantity: number;
  sourceUnit: ExtractedProductMeasure["unit"];
};

export const productNameStopwords = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "com",
  "sem",
  "tipo",
  "tradicional",
  "integral",
  "parboilizado",
  "parbolilizado",
  "premium",
  "extra",
  "virgem",
  "leve",
  "pague",
  "frasco",
  "pote",
  "pacote",
  "caixa",
  "garrafa",
  "tp",
  "pet",
  "un",
  "kg",
  "g",
  "ml",
  "l",
]);

export function normalizeProductName(value: string) {
  return value
    .normalize("NFD")
    .replace(accentRegex, "")
    .toLowerCase()
    .replace(/(\d)[.,](\d)/g, "$1__DECIMAL__$2")
    .replace(/(\d)[ ]?(kg|g|ml|l|lt|lts|litro|litros|un|und|unidade|unidades)\b/g, "$1 $2")
    .replace(/[^\w\s]/g, " ")
    .replace(/__DECIMAL__/g, ",")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => unitMap[token] ?? token)
    .join(" ")
    .trim();
}

export function getNormalizedProductName(input: NormalizedProductIdentityInput | string) {
  if (typeof input === "string") {
    return normalizeProductName(input);
  }

  return normalizeProductName(input.normalizedName || input.name);
}

export function getNormalizedPackageText(packageText?: string | null) {
  return packageText ? normalizeProductName(packageText).replace(/\s+/g, "") : undefined;
}

export function getProductIdentityKey(input: NormalizedProductIdentityInput) {
  return `${getNormalizedProductName(input)}|${getNormalizedPackageText(input.packageText) ?? ""}`;
}

export function extractPackaging(text: string): ParsedPackaging {
  const parsedMeasure = extractProductMeasure(text);

  if (parsedMeasure) {
    return {
      quantity: parsedMeasure.quantity,
      unit: parsedMeasure.unit,
      packageText: parsedMeasure.packageText,
    };
  }

  const normalized = normalizeProductName(text);
  const unitMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s?(un)\b/);

  if (!unitMatch) {
    return {};
  }

  const quantity = Number(unitMatch[1].replace(",", "."));
  const unit = unitMatch[2] as ParsedPackaging["unit"];

  return {
    quantity,
    unit: Number.isFinite(quantity) ? unit : undefined,
    packageText: Number.isFinite(quantity)
      ? `${String(unitMatch[1]).replace(".", ",")}${unit}`
      : undefined,
  };
}

export function extractProductMeasure(text: string): ExtractedProductMeasure | null {
  const normalized = normalizeProductName(text);
  const measureRegex = /(?:(\d+)\s*x\s*)?(\d+(?:[.,]\d+)?)\s?(kg|g|ml|l)\b/g;
  const matches = [...normalized.matchAll(measureRegex)];
  const match = matches.at(-1);

  if (!match) {
    return null;
  }

  const multiplier = match[1] ? Number(match[1]) : 1;
  const quantity = Number(match[2].replace(",", "."));
  const unit = match[3] as ExtractedProductMeasure["unit"];

  if (
    !Number.isFinite(multiplier) ||
    !Number.isFinite(quantity) ||
    multiplier <= 0 ||
    quantity <= 0
  ) {
    return null;
  }

  const totalQuantity = quantity * multiplier;
  const standardized: Pick<ExtractedProductMeasure, "standardizedQuantity" | "standardizedUnit"> =
    unit === "kg" || unit === "l"
      ? { standardizedQuantity: totalQuantity, standardizedUnit: unit }
      : {
          standardizedQuantity: totalQuantity / 1000,
          standardizedUnit: unit === "g" ? "kg" : "l",
        };
  const displayQuantity = Number.isInteger(totalQuantity)
    ? String(totalQuantity)
    : String(totalQuantity).replace(".", ",");

  return {
    quantity: totalQuantity,
    unit,
    standardizedQuantity: standardized.standardizedQuantity,
    standardizedUnit: standardized.standardizedUnit,
    packageText: `${displayQuantity}${unit}`,
  };
}

export function calculateStandardizedPricePerUnit(
  productName: string,
  totalPrice: number
): StandardizedPricePerUnit | null {
  const measure = extractProductMeasure(productName);

  if (
    !measure ||
    !Number.isFinite(totalPrice) ||
    totalPrice < 0 ||
    measure.standardizedQuantity <= 0
  ) {
    return null;
  }

  return {
    value: Number((totalPrice / measure.standardizedQuantity).toFixed(2)),
    unit: measure.standardizedUnit,
    quantity: measure.standardizedQuantity,
    sourceQuantity: measure.quantity,
    sourceUnit: measure.unit,
  };
}

export function inferBrand(text: string) {
  const normalized = normalizeProductName(text);
  const brands = [
    "vicosa",
    "coca cola",
    "camil",
    "kicaldo",
    "soya",
    "itambe",
    "pilao",
    "dona benta",
    "renata",
    "sadia",
    "ype",
    "omo",
    "heinz",
    "vigor",
    "aurora",
    "minalba",
    "pif paf",
    "perdigao",
    "bauducco",
    "ducoco",
    "suinco",
    "spaten",
    "itaipava",
    "chamyto",
    "vitaliv",
    "caboclo",
    "porto alegre",
    "nestle",
    "batavo",
    "vilma",
    "liza",
    "heineken",
    "sprite",
  ];

  const brand = brands.find((brand) => {
    const normalizedBrand = normalizeProductName(brand);
    return new RegExp(`(^|\\s)${normalizedBrand}(\\s|$)`).test(normalized);
  });

  return brand ? normalizeProductName(brand) : undefined;
}

export function tokenizeProductName(text: string) {
  return normalizeProductName(text)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !productNameStopwords.has(token))
    .filter((token) => !/^\d+(?:,\d+)?$/.test(token));
}

export function normalizeProductNameForMatching(text: string) {
  return tokenizeProductName(text).join(" ");
}

export function classifyProduct(text: string) {
  const normalized = normalizeProductName(text);

  const categories: Array<{ key: string; terms: string[] }> = [
    { key: "papel-toalha", terms: ["papel toalha", "toalha"] },
    { key: "papel-higienico", terms: ["papel higienico", "higienico"] },
    { key: "arroz", terms: ["arroz"] },
    { key: "feijao", terms: ["feijao"] },
    { key: "oleo", terms: ["oleo", "azeite"] },
    { key: "leite", terms: ["leite"] },
    { key: "manteiga", terms: ["manteiga", "margarina"] },
    { key: "queijo", terms: ["queijo", "mussarela", "muçarela", "requeijao"] },
    { key: "presunto", terms: ["presunto", "mortadela"] },
    { key: "pao", terms: ["pao"] },
    { key: "refrigerante", terms: ["refrigerante", "coca cola", "guarana", "fanta", "sprite"] },
    { key: "suco", terms: ["suco"] },
    { key: "agua", terms: ["agua"] },
    { key: "carne", terms: ["patinho", "alcatra", "musculo", "carne", "bovino"] },
    { key: "frango", terms: ["frango", "peito", "coxa", "sobrecoxa", "asa"] },
    { key: "linguica", terms: ["linguica", "calabresa", "toscana"] },
    { key: "tomate", terms: ["tomate"] },
    { key: "batata", terms: ["batata"] },
    { key: "cebola", terms: ["cebola"] },
    { key: "alface", terms: ["alface"] },
    { key: "detergente", terms: ["detergente"] },
    { key: "sabao", terms: ["sabao", "lava", "roupas", "omo"] },
  ];

  const match = categories.find((category) =>
    category.terms.some((term) => normalized.includes(normalizeProductName(term)))
  );

  return match?.key;
}

export function toComparableAmount(quantity?: number, unit?: ParsedPackaging["unit"]) {
  if (!quantity || !unit) {
    return null;
  }

  if (unit === "kg" || unit === "l" || unit === "un") {
    return { amount: quantity, unit };
  }

  if (unit === "g") {
    return { amount: quantity / 1000, unit: "kg" as const };
  }

  return { amount: quantity / 1000, unit: "l" as const };
}
