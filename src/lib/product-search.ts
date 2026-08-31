import {
  classifyProductCategories,
  normalizeProductName,
  productCategoriesOverlap,
  productNameStopwords,
} from "@/lib/normalize-product";
import { Product } from "@/providers/types";

export const defaultProductSearchLimit = 32;
export const maxProductSearchLimit = 48;

export type ProductSearchPage = {
  products: Product[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  nextPage: number | null;
};

const searchTokenAliases: Record<string, string[]> = {
  carne: [
    "bovino",
    "frango",
    "linguica",
    "calabresa",
    "toscana",
    "patinho",
    "alcatra",
    "musculo",
    "costela",
    "peito",
    "coxa",
    "sobrecoxa",
    "asa",
    "file",
    "sassami",
  ],
  frango: ["peito", "coxa", "sobrecoxa", "asa", "file", "sassami"],
  bovino: ["carne", "patinho", "alcatra", "musculo", "costela"],
  linguica: ["calabresa", "toscana"],
  bebida: ["refrigerante", "suco", "agua", "cerveja"],
  queijo: ["mussarela", "muçarela", "requeijao"],
  frios: ["queijo", "mussarela", "muçarela", "presunto", "mortadela"],
  laticinio: ["leite", "manteiga", "queijo", "requeijao", "iogurte"],
  limpeza: ["detergente", "sabao", "desinfetante", "amaciante"],
};

export function productSearchTokens(value: string) {
  return normalizeProductName(value)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !productNameStopwords.has(token));
}

export function productSearchTokenAlternatives(token: string) {
  return [...new Set([token, ...(searchTokenAliases[token] ?? [])].map(normalizeProductName))];
}

function containsOrderedTokens(productTokens: string[], queryTokens: string[]) {
  if (queryTokens.length === 0 || queryTokens.length > productTokens.length) {
    return false;
  }

  return productTokens.some((_, startIndex) =>
    queryTokens.every((token, offset) => productTokens[startIndex + offset] === token)
  );
}

export function containsAllSearchTokens(productTokens: string[], queryTokens: string[]) {
  if (queryTokens.length === 0 || productTokens.length === 0) {
    return false;
  }

  return queryTokens.every((token) =>
    productTokens.some((productToken) => productSearchTokenAlternatives(token).includes(productToken))
  );
}

function startsWithOrderedTokens(productTokens: string[], queryTokens: string[]) {
  return queryTokens.every((token, index) => productTokens[index] === token);
}

export function getProductSearchScore(product: Product, query: string) {
  const normalizedQuery = normalizeProductName(query);
  const normalizedName = normalizeProductName(product.normalizedName || product.name);
  const normalizedBrand = product.brand ? normalizeProductName(product.brand) : "";
  const productTokens = productSearchTokens(normalizedName);
  const queryTokens = productSearchTokens(normalizedQuery);
  const queryCategories = classifyProductCategories(query);
  const productCategories = classifyProductCategories(product.name);
  const categoryAligned = productCategoriesOverlap(queryCategories, productCategories);

  let score = 0;

  if (normalizedName === normalizedQuery) {
    score += 1000;
  }

  if (normalizedName.startsWith(`${normalizedQuery} `)) {
    score += 800;
  }

  if (startsWithOrderedTokens(productTokens, queryTokens)) {
    score += 650;
  }

  if (containsOrderedTokens(productTokens, queryTokens)) {
    score += 350;
  }

  if (containsAllSearchTokens(productTokens, queryTokens)) {
    score += 260;
  }

  if (normalizedName.includes(normalizedQuery)) {
    score += 150;
  }

  if (normalizedBrand === normalizedQuery) {
    score += 140;
  } else if (normalizedBrand.includes(normalizedQuery)) {
    score += 70;
  }

  if (categoryAligned) {
    score += 120;
  }

  const unmatchedQueryTokens = queryTokens.filter(
    (token) =>
      !productTokens.some((productToken) => productSearchTokenAlternatives(token).includes(productToken))
  );
  score -= unmatchedQueryTokens.length * 120;
  score -= Math.max(0, productTokens.length - queryTokens.length) * 4;

  if (product.promotion) {
    score += 8;
  }

  return score;
}

export function sortProductsBySearchRelevance(products: Product[], query: string) {
  return [...products].sort((left, right) => {
    const scoreDifference = getProductSearchScore(right, query) - getProductSearchScore(left, query);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" });
  });
}

export function paginateProducts(
  products: Product[],
  page: number,
  limit: number
): ProductSearchPage {
  const safePage = Math.max(1, Math.trunc(page));
  const safeLimit = Math.min(maxProductSearchLimit, Math.max(1, Math.trunc(limit)));
  const start = (safePage - 1) * safeLimit;
  const pageProducts = products.slice(start, start + safeLimit);
  const hasMore = start + safeLimit < products.length;

  return {
    products: pageProducts,
    page: safePage,
    limit: safeLimit,
    total: products.length,
    hasMore,
    nextPage: hasMore ? safePage + 1 : null,
  };
}
