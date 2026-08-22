import { CompareResult } from "@/lib/compare-cart";
import { storeKeys } from "@/lib/store";

export type ReportEconomy = {
  referenceTotal: number | null;
  savings: number;
  savingsPercentage: number;
  available: boolean;
};

export function calculateReportEconomy(result: CompareResult): ReportEconomy {
  const optimizedIsComplete = result.lines.every((line) => line.bestStore !== null);
  const averageSubtotals = result.lines.map((line) => {
    const availableSubtotals = storeKeys
      .map((store) => line.stores[store].subtotal)
      .filter((subtotal): subtotal is number => subtotal !== null);

    if (availableSubtotals.length === 0) {
      return null;
    }

    return availableSubtotals.reduce((sum, subtotal) => sum + subtotal, 0) / availableSubtotals.length;
  });
  const averageCombinationIsComplete = averageSubtotals.every(
    (subtotal): subtotal is number => subtotal !== null
  );

  if (!optimizedIsComplete || !averageCombinationIsComplete) {
    return {
      referenceTotal: null,
      savings: 0,
      savingsPercentage: 0,
      available: false,
    };
  }

  const referenceTotal = Number(averageSubtotals.reduce((sum, subtotal) => sum + subtotal, 0).toFixed(2));
  const savings = Math.max(Number((referenceTotal - result.optimized.total).toFixed(2)), 0);
  const savingsPercentage = referenceTotal > 0
    ? Number(((savings / referenceTotal) * 100).toFixed(1))
    : 0;

  return {
    referenceTotal,
    savings,
    savingsPercentage,
    available: true,
  };
}
