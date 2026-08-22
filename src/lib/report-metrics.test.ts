import { describe, expect, it } from "vitest";
import { CompareResult, ComparisonLine } from "@/lib/compare-cart";
import { storeKeys } from "@/lib/store";
import { StoreKey } from "@/providers/types";
import { calculateReportEconomy } from "@/lib/report-metrics";

function lineWithPrices(
  query: string,
  prices: Partial<Record<StoreKey, number>>,
  bestStore: StoreKey | null
): ComparisonLine {
  return {
    query,
    quantity: 1,
    bestStore,
    stores: Object.fromEntries(
      storeKeys.map((store) => [
        store,
        {
          product: null,
          subtotal: prices[store] ?? null,
          found: prices[store] !== undefined,
        },
      ])
    ) as ComparisonLine["stores"],
  };
}

function resultWithLines(lines: ComparisonLine[], optimizedTotal: number): CompareResult {
  return {
    lines,
    stores: Object.fromEntries(
      storeKeys.map((store) => [
        store,
        {
          store,
          total: 0,
          foundItems: lines.filter((line) => line.stores[store].found).length,
          requestedItems: lines.length,
          missingItems: lines.filter((line) => !line.stores[store].found).length,
          complete: lines.every((line) => line.stores[store].found),
        },
      ])
    ) as CompareResult["stores"],
    winner: { store: null, total: null, savings: 0, savingsPercentage: 0 },
    optimized: { total: optimizedTotal, savingsVsBestComplete: 0, allocations: {} as never },
    containsMockData: false,
  };
}

describe("calculateReportEconomy", () => {
  it("compara a estratégia CotaÍ com a soma da média de preços por produto", () => {
    const result = resultWithLines(
      [lineWithPrices("Arroz 5kg", { escola: 90, amantino: 120, bh: 100, bahamas: 110 }, "escola")],
      80
    );

    const economy = calculateReportEconomy(result);
    expect(economy.referenceTotal).toBe(105);
    expect(economy.savings).toBe(25);
    expect(economy.savingsPercentage).toBe(23.8);
  });

  it("calcula economia mesmo quando nenhuma loja possui a compra completa", () => {
    const result = resultWithLines(
      [
        lineWithPrices("Arroz 5kg", { escola: 40, bh: 50 }, "escola"),
        lineWithPrices("Feijão 1kg", { amantino: 30, bahamas: 45 }, "amantino"),
      ],
      70
    );

    expect(storeKeys.every((store) => !result.stores[store].complete)).toBe(true);
    expect(calculateReportEconomy(result)).toMatchObject({
      referenceTotal: 82.5,
      savings: 12.5,
      savingsPercentage: 15.2,
      available: true,
    });
  });

  it("não calcula economia quando um item não existe em nenhuma loja", () => {
    const result = resultWithLines([lineWithPrices("Produto inexistente", {}, null)], 0);
    expect(calculateReportEconomy(result).available).toBe(false);
  });
});
