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

const stopwords = new Set([
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

export function extractPackaging(text: string): ParsedPackaging {
  const normalized = normalizeProductName(text);
  const match = normalized.match(/(\d+(?:[.,]\d+)?)\s?(kg|g|ml|l|un)\b/);

  if (!match) {
    return {};
  }

  const quantity = Number(match[1].replace(",", "."));
  const unit = match[2] as ParsedPackaging["unit"];

  return {
    quantity,
    unit,
    packageText: `${String(match[1]).replace(".", ",")}${unit}`,
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
    .filter((token) => !stopwords.has(token))
    .filter((token) => !/^\d+(?:,\d+)?$/.test(token));
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
