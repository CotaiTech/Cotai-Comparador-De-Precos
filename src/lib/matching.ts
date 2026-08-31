import { Product } from "@/providers/types";
import {
  classifyProductCategories,
  extractPackaging,
  getNormalizedProductName,
  inferBrand,
  normalizeProductName,
  normalizeProductNameForMatching,
  productCategoriesOverlap,
  toComparableAmount,
  tokenizeProductName,
} from "@/lib/normalize-product";

export type CanonicalProductMatchCandidate = {
  id: string;
  name: string;
  normalizedName?: string | null;
};

export function levenshteinDistance(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  if (left.length === 0) {
    return right.length;
  }

  if (right.length === 0) {
    return left.length;
  }

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost
      );
    }

    for (let index = 0; index <= right.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
}

function calculateStringSimilarity(left: string, right: string) {
  const longest = Math.max(left.length, right.length);

  if (longest === 0) {
    return 1;
  }

  return 1 - levenshteinDistance(left, right) / longest;
}

function calculateDirectionalTokenSimilarity(sourceTokens: string[], targetTokens: string[]) {
  if (sourceTokens.length === 0 || targetTokens.length === 0) {
    return 0;
  }

  const total = sourceTokens.reduce((sum, sourceToken) => {
    const bestTokenScore = Math.max(
      ...targetTokens.map((targetToken) => calculateStringSimilarity(sourceToken, targetToken))
    );

    return sum + bestTokenScore;
  }, 0);

  return total / sourceTokens.length;
}

export function calculateTokenFuzzySimilarity(left: string, right: string) {
  const leftTokens = tokenizeProductName(left);
  const rightTokens = tokenizeProductName(right);

  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0;
  }

  const sortedLeftTokens = [...leftTokens].sort();
  const sortedRightTokens = [...rightTokens].sort();

  if (
    sortedLeftTokens.length === sortedRightTokens.length &&
    sortedLeftTokens.every((token, index) => token === sortedRightTokens[index])
  ) {
    return 1;
  }

  const forwardScore = calculateDirectionalTokenSimilarity(leftTokens, rightTokens);
  const reverseScore = calculateDirectionalTokenSimilarity(rightTokens, leftTokens);
  const normalizedLeft = normalizeProductNameForMatching(left);
  const normalizedRight = normalizeProductNameForMatching(right);
  const phraseScore = calculateStringSimilarity(normalizedLeft, normalizedRight);

  return Number((forwardScore * 0.4 + reverseScore * 0.4 + phraseScore * 0.2).toFixed(4));
}

export function findClosestCanonicalProductId(
  scrapedProductName: string,
  canonicalProducts: CanonicalProductMatchCandidate[],
  threshold = 0.85
) {
  const ranked = canonicalProducts
    .map((product) => {
      const canonicalName = getNormalizedProductName(product);

      return {
        id: product.id,
        score: calculateTokenFuzzySimilarity(getNormalizedProductName(scrapedProductName), canonicalName),
      };
    })
    .sort((left, right) => right.score - left.score);

  const best = ranked[0];

  if (!best || best.score < threshold) {
    return null;
  }

  return best.id;
}

export function calculateProductSimilarity(query: string, product: Product) {
  const normalizedQuery = getNormalizedProductName(query);
  const productName = getNormalizedProductName(product);

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

  const queryCategories = classifyProductCategories(query);
  const productCategories = classifyProductCategories(product.name);
  const categoryAligned = productCategoriesOverlap(queryCategories, productCategories);
  const categoryConflict =
    queryCategories.length > 0 && productCategories.length > 0 && !categoryAligned;
  const categoryScore =
    queryCategories.length === 0 || productCategories.length === 0 ? 0.5 : categoryAligned ? 1 : 0;

  const queryBrand = inferBrand(query);
  const productBrand = product.brand ? normalizeProductName(product.brand) : undefined;
  const brandConflict = Boolean(queryBrand) && Boolean(productBrand) && queryBrand !== productBrand;
  const brandScore = !queryBrand || !productBrand ? 0.5 : queryBrand === productBrand ? 1 : 0;
  const fuzzyScore = calculateTokenFuzzySimilarity(normalizedQuery, productName);

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
    fuzzyScore * 0.3 +
    textScore * 0.15 +
    anchorScore * 0.15 +
    packagingScore * 0.25 +
    brandScore * 0.05 +
    categoryScore * 0.1 +
    (categoryAligned ? 0.05 : 0);

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
