import { Product } from "@/providers/types";
import {
  classifyProduct,
  extractPackaging,
  inferBrand,
  normalizeProductName,
  toComparableAmount,
  tokenizeProductName,
} from "@/lib/normalize-product";

export function calculateProductSimilarity(query: string, product: Product) {
  const normalizedQuery = normalizeProductName(query);
  const productName = product.normalizedName || normalizeProductName(product.name);

  const queryTokens = new Set(tokenizeProductName(query));
  const productTokens = new Set(tokenizeProductName(productName));

  const intersection = [...queryTokens].filter((token) => productTokens.has(token)).length;
  const union = new Set([...queryTokens, ...productTokens]).size || 1;
  const textScore = intersection / union;
  const anchorScore = queryTokens.size > 0 ? intersection / queryTokens.size : 0;

  const queryPack = extractPackaging(query);
  const queryComparable = toComparableAmount(queryPack.quantity, queryPack.unit);
  const productComparable = toComparableAmount(product.quantity, product.unit);

  let packagingScore = 0.2;
  let incompatiblePackaging = false;
  if (!queryComparable || !productComparable) {
    packagingScore = 0.4;
  } else if (queryComparable.unit === productComparable.unit) {
    const delta = Math.abs(queryComparable.amount - productComparable.amount);
    const relativeDelta = queryComparable.amount > 0 ? delta / queryComparable.amount : 1;

    if (delta === 0) {
      packagingScore = 1;
    } else if (relativeDelta <= 0.05) {
      packagingScore = 0.9;
    } else if (relativeDelta <= 0.15) {
      packagingScore = 0.65;
    } else {
      packagingScore = 0;
      incompatiblePackaging = true;
    }
  } else {
    packagingScore = 0;
    incompatiblePackaging = true;
  }

  const queryCategory = classifyProduct(query);
  const productCategory = classifyProduct(product.name);
  const categoryConflict =
    Boolean(queryCategory) && Boolean(productCategory) && queryCategory !== productCategory;
  const categoryScore =
    !queryCategory || !productCategory ? 0.5 : queryCategory === productCategory ? 1 : 0;
  const categoryAligned = Boolean(queryCategory) && Boolean(productCategory) && queryCategory === productCategory;

  const queryBrand = inferBrand(query);
  const productBrand = product.brand ? normalizeProductName(product.brand) : undefined;
  const brandConflict = Boolean(queryBrand) && Boolean(productBrand) && queryBrand !== productBrand;
  const brandScore = !queryBrand || !productBrand ? 0.5 : queryBrand === productBrand ? 1 : 0;

  if (categoryConflict || brandConflict) {
    return 0;
  }

  if (queryTokens.size > 0 && anchorScore < 0.25 && !categoryAligned) {
    return 0;
  }

  if (incompatiblePackaging && anchorScore < 0.75) {
    return 0;
  }

  const score =
    textScore * 0.3 +
    anchorScore * 0.3 +
    packagingScore * 0.25 +
    brandScore * 0.05 +
    categoryScore * 0.1;

  return Number(score.toFixed(4));
}

export function findBestMatch(query: string, products: Product[], threshold = 0.44) {
  const ranked = products
    .map((product) => ({
      product,
      score: calculateProductSimilarity(query, product),
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < threshold) {
    return null;
  }

  const second = ranked[1];
  if (second && best.score - second.score < 0.03 && second.score > threshold) {
    return null;
  }

  return best;
}
