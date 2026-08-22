import { findBestMatch } from "@/lib/matching";
import { getProductSubtotal } from "@/lib/pricing";
import { storeKeys } from "@/lib/store";
import { Product, StoreKey } from "@/providers/types";

export type ComparisonLine = {
  query: string;
  quantity: number;
  bestStore: StoreKey | null;
  stores: Record<
    StoreKey,
    {
      product: Product | null;
      subtotal: number | null;
      found: boolean;
    }
  >;
};

export type StoreSummary = {
  store: StoreKey;
  total: number;
  foundItems: number;
  requestedItems: number;
  missingItems: number;
  complete: boolean;
};

export type OptimizedSummary = {
  total: number;
  savingsVsBestComplete: number;
  allocations: Record<
    StoreKey,
    {
      total: number;
      items: number;
      lines: Array<{
        query: string;
        quantity: number;
        subtotal: number;
        product: Product;
      }>;
    }
  >;
};

export type CompareResult = {
  lines: ComparisonLine[];
  stores: Record<StoreKey, StoreSummary>;
  winner: {
    store: StoreKey | null;
    total: number | null;
    savings: number;
    savingsPercentage: number;
  };
  optimized: OptimizedSummary;
  containsMockData: boolean;
};

export function compareCart(
  items: Array<{ query: string; quantity: number }>,
  productsByStore: Record<StoreKey, Product[]>
): CompareResult {
  const lines: ComparisonLine[] = items.map((item) => {
    const entries = Object.fromEntries(
      storeKeys.map((store) => {
        const match = findBestMatch(item.query, productsByStore[store]);
        const subtotal = match ? getProductSubtotal(match.product.price, item.quantity) : null;

        return [
          store,
          {
            product: match?.product ?? null,
            subtotal,
            found: Boolean(match),
          },
        ];
      })
    ) as ComparisonLine["stores"];

    const bestEntry = storeKeys
      .filter((store) => entries[store].subtotal !== null)
      .sort((left, right) => (entries[left].subtotal ?? Number.POSITIVE_INFINITY) - (entries[right].subtotal ?? Number.POSITIVE_INFINITY))[0];

    return {
      query: item.query,
      quantity: item.quantity,
      bestStore: bestEntry ?? null,
      stores: entries,
    };
  });

  const stores = Object.fromEntries(
    storeKeys.map((store) => {
      const foundItems = lines.filter((line) => line.stores[store].found).length;
      const total = Number(
        lines.reduce((sum, line) => sum + (line.stores[store].subtotal ?? 0), 0).toFixed(2)
      );

      return [
        store,
        {
          store,
          total,
          foundItems,
          requestedItems: items.length,
          missingItems: items.length - foundItems,
          complete: foundItems === items.length,
        },
      ];
    })
  ) as Record<StoreKey, StoreSummary>;

  const completeStores = storeKeys
    .map((store) => stores[store])
    .filter((store) => store.complete)
    .sort((a, b) => a.total - b.total);
  const everyStoreComplete = completeStores.length === storeKeys.length;
  const winnerStore = everyStoreComplete ? (completeStores[0] ?? null) : null;
  const runnerUp = completeStores[1] ?? null;
  const savings = winnerStore && runnerUp ? Number((runnerUp.total - winnerStore.total).toFixed(2)) : 0;
  const savingsPercentage =
    winnerStore && runnerUp && runnerUp.total > 0
      ? Number((((runnerUp.total - winnerStore.total) / runnerUp.total) * 100).toFixed(1))
      : 0;

  const optimized = buildOptimizedSummary(lines, winnerStore?.total ?? null);
  const containsMockData = lines.some((line) =>
    storeKeys.some((store) => line.stores[store].product?.source === "mock")
  );

  return {
    lines,
    stores,
    winner: {
      store: winnerStore?.store ?? null,
      total: winnerStore?.total ?? null,
      savings,
      savingsPercentage,
    },
    optimized,
    containsMockData,
  };
}

function buildOptimizedSummary(lines: ComparisonLine[], bestCompleteTotal: number | null): OptimizedSummary {
  const allocations = storeKeys.reduce(
    (acc, store) => {
      acc[store] = { total: 0, items: 0, lines: [] };
      return acc;
    },
    {} as OptimizedSummary["allocations"]
  );

  for (const line of lines) {
    const store = line.bestStore;
    if (!store) {
      continue;
    }

    const selected = line.stores[store];
    if (!selected.product || selected.subtotal === null) {
      continue;
    }

    allocations[store].total = Number((allocations[store].total + selected.subtotal).toFixed(2));
    allocations[store].items += 1;
    allocations[store].lines.push({
      query: line.query,
      quantity: line.quantity,
      subtotal: selected.subtotal,
      product: selected.product,
    });
  }

  const total = Number(
    storeKeys.reduce((sum, store) => sum + allocations[store].total, 0).toFixed(2)
  );
  const savingsVsBestComplete =
    bestCompleteTotal !== null ? Number((bestCompleteTotal - total).toFixed(2)) : 0;

  return {
    total,
    savingsVsBestComplete,
    allocations,
  };
}
