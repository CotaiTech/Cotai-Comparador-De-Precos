import { describe, expect, it } from "vitest";
import { createDefaultProfile } from "@/lib/account-types";
import { CompareResult } from "@/lib/compare-cart";
import { calculateRouteScenarios } from "@/lib/route-optimizer";
import { storeKeys } from "@/lib/store";

describe("calculateRouteScenarios", () => {
  it("inclui ida e volta e combustível no total ajustado", () => {
    const stores = Object.fromEntries(storeKeys.map((store) => [store, { store, total: 100, foundItems: 1, requestedItems: 1, missingItems: 0, complete: true }])) as CompareResult["stores"];
    const allocations = Object.fromEntries(storeKeys.map((store, index) => [store, { total: index === 0 ? 90 : 0, items: index === 0 ? 1 : 0, lines: [] }])) as unknown as CompareResult["optimized"]["allocations"];
    const result = { lines: [], stores, winner: { store: "escola", total: 100, savings: 0, savingsPercentage: 0 }, optimized: { total: 90, savingsVsBestComplete: 10, allocations }, containsMockData: false } as CompareResult;
    const profile = createDefaultProfile();
    profile.storeDistances.escola = 5;
    profile.fuelPrice = 6;
    profile.vehicleKmPerLiter = 10;

    const economical = calculateRouteScenarios(result, profile).find((item) => item.id === "economica");
    expect(economical?.distance).toBe(10);
    expect(economical?.travelCost).toBe(6);
    expect(economical?.adjustedTotal).toBe(96);
  });
});
