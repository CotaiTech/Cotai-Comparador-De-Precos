import { AccountProfile } from "@/lib/account-types";
import { CompareResult } from "@/lib/compare-cart";
import { storeKeys } from "@/lib/store";
import { StoreKey } from "@/providers/types";

export type RouteScenario = {
  id: "rapida" | "curta" | "economica";
  stores: StoreKey[];
  distance: number;
  travelCost: number;
  purchaseCost: number;
  adjustedTotal: number;
  estimatedMinutes: number;
};

function round(value: number) {
  return Number(value.toFixed(2));
}

function travelCost(distance: number, profile: AccountProfile) {
  return round((distance / Math.max(profile.vehicleKmPerLiter, 0.1)) * profile.fuelPrice);
}

export function calculateRouteScenarios(result: CompareResult, profile: AccountProfile): RouteScenario[] {
  const completeStores = storeKeys.filter((store) => result.stores[store].complete);
  const shortestStore = [...completeStores].sort((a, b) => profile.storeDistances[a] - profile.storeDistances[b])[0];
  const singleStoreOptions = completeStores.map((store) => {
    const distance = profile.storeDistances[store] * 2;
    const fuel = travelCost(distance, profile);
    return { store, distance, fuel, total: round(result.stores[store].total + fuel) };
  });
  const bestSingle = [...singleStoreOptions].sort((a, b) => a.total - b.total)[0];

  const optimizedStores = storeKeys.filter((store) => result.optimized.allocations[store].items > 0);
  const optimizedDistance = round(optimizedStores.reduce((sum, store) => sum + profile.storeDistances[store] * 2, 0));
  const optimizedTravelCost = travelCost(optimizedDistance, profile);
  const optimizedOption = {
    stores: optimizedStores,
    distance: optimizedDistance,
    travelCost: optimizedTravelCost,
    purchaseCost: result.optimized.total,
    adjustedTotal: round(result.optimized.total + optimizedTravelCost),
  };

  const economicCandidates = [
    ...singleStoreOptions.map((option) => ({ stores: [option.store], distance: option.distance, travelCost: option.fuel, purchaseCost: result.stores[option.store].total, adjustedTotal: option.total })),
    optimizedOption,
  ].filter((option) => option.stores.length > 0);
  const economical = economicCandidates.sort((a, b) => a.adjustedTotal - b.adjustedTotal)[0] ?? optimizedOption;

  const shortestDistance = shortestStore ? profile.storeDistances[shortestStore] * 2 : optimizedDistance;
  const shortestPurchase = shortestStore ? result.stores[shortestStore].total : result.optimized.total;
  const shortestFuel = travelCost(shortestDistance, profile);

  return [
    {
      id: "rapida",
      stores: bestSingle ? [bestSingle.store] : optimizedStores,
      distance: bestSingle?.distance ?? optimizedDistance,
      travelCost: bestSingle?.fuel ?? optimizedTravelCost,
      purchaseCost: bestSingle ? result.stores[bestSingle.store].total : result.optimized.total,
      adjustedTotal: bestSingle?.total ?? optimizedOption.adjustedTotal,
      estimatedMinutes: Math.max(8, Math.round(((bestSingle?.distance ?? optimizedDistance) / 30) * 60)),
    },
    {
      id: "curta",
      stores: shortestStore ? [shortestStore] : optimizedStores,
      distance: round(shortestDistance),
      travelCost: shortestFuel,
      purchaseCost: shortestPurchase,
      adjustedTotal: round(shortestPurchase + shortestFuel),
      estimatedMinutes: Math.max(8, Math.round((shortestDistance / 30) * 60)),
    },
    {
      id: "economica",
      ...economical,
      estimatedMinutes: Math.max(8, Math.round((economical.distance / 30) * 60)),
    },
  ];
}
