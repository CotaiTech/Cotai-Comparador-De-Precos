import { AccountProfile } from "@/lib/account-types";
import { CompareResult } from "@/lib/compare-cart";
import { storeKeys } from "@/lib/store";
import { StoreKey } from "@/providers/types";

export type RouteStoreKey = "escola" | "amantino" | "bahamas";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type ShoppingRouteItem = {
  id?: string;
  name: string;
  quantity: number;
  prices: Partial<Record<RouteStoreKey, number>>;
};

export type StoreCartTotal = {
  store: RouteStoreKey;
  total: number | null;
  complete: boolean;
  missingItems: string[];
};

export type ShoppingRoutePlan = {
  type: "single-store" | "split-two-stores";
  stores: RouteStoreKey[];
  route: RouteStoreKey[];
  distanceKm: number;
  travelPenalty: number;
  purchaseCost: number;
  adjustedTotal: number;
  savingsVsBestSingleStore: number;
  allocations: Record<
    RouteStoreKey,
    {
      total: number;
      items: Array<{
        itemId?: string;
        name: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }>;
    }
  >;
};

export type ShoppingRouteRecommendation = {
  startingCoordinates: Coordinates;
  costPerKm: number;
  storeTotals: StoreCartTotal[];
  recommendation: ShoppingRoutePlan | null;
  plans: ShoppingRoutePlan[];
};

export const routeStoreKeys = ["escola", "amantino", "bahamas"] as const;

export const defaultStoreCoordinates: Record<RouteStoreKey, Coordinates> = {
  escola: { latitude: -20.7559, longitude: -42.8795 },
  amantino: { latitude: -20.7534, longitude: -42.8819 },
  bahamas: { latitude: -20.7546, longitude: -42.8728 },
};

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

function roundDistance(value: number) {
  return Number(value.toFixed(3));
}

function travelCost(distance: number, profile: AccountProfile) {
  return round((distance / Math.max(profile.vehicleKmPerLiter, 0.1)) * profile.fuelPrice);
}

function distanceKm(left: Coordinates, right: Coordinates) {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(right.latitude - left.latitude);
  const longitudeDelta = toRadians(right.longitude - left.longitude);
  const leftLatitude = toRadians(left.latitude);
  const rightLatitude = toRadians(right.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function routeDistanceKm(
  startingCoordinates: Coordinates,
  route: RouteStoreKey[],
  storeCoordinates: Record<RouteStoreKey, Coordinates>
) {
  if (route.length === 0) {
    return 0;
  }

  let total = 0;
  let previous = startingCoordinates;

  for (const store of route) {
    total += distanceKm(previous, storeCoordinates[store]);
    previous = storeCoordinates[store];
  }

  total += distanceKm(previous, startingCoordinates);

  return total;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) {
    return [items];
  }

  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [
      item,
      ...rest,
    ])
  );
}

function optimizeStoreVisitOrder(
  startingCoordinates: Coordinates,
  stores: RouteStoreKey[],
  storeCoordinates: Record<RouteStoreKey, Coordinates>
): RouteStoreKey[] {
  if (stores.length === 0) {
    return [];
  }

  return (
    permutations(stores).sort(sortRoutesByDistance(startingCoordinates, storeCoordinates))[0] ?? []
  );
}

function createEmptyAllocations(): ShoppingRoutePlan["allocations"] {
  return routeStoreKeys.reduce(
    (allocations, store) => {
      allocations[store] = { total: 0, items: [] };
      return allocations;
    },
    {} as ShoppingRoutePlan["allocations"]
  );
}

function buildStoreCombinations() {
  const combinations: RouteStoreKey[][] = routeStoreKeys.map((store) => [store]);

  for (let leftIndex = 0; leftIndex < routeStoreKeys.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < routeStoreKeys.length; rightIndex += 1) {
      combinations.push([routeStoreKeys[leftIndex], routeStoreKeys[rightIndex]]);
    }
  }

  return combinations;
}

function sortPlansByAdjustedTotal(left: ShoppingRoutePlan, right: ShoppingRoutePlan) {
  if (left.adjustedTotal !== right.adjustedTotal) {
    return left.adjustedTotal - right.adjustedTotal;
  }

  return left.stores.length - right.stores.length;
}

function sortRoutesByDistance(
  startingCoordinates: Coordinates,
  storeCoordinates: Record<RouteStoreKey, Coordinates>
) {
  return (left: RouteStoreKey[], right: RouteStoreKey[]) =>
    routeDistanceKm(startingCoordinates, left, storeCoordinates) -
    routeDistanceKm(startingCoordinates, right, storeCoordinates);
}

function sortStoreTotalsByTotal(
  left: StoreCartTotal & { total: number },
  right: StoreCartTotal & { total: number }
) {
  return left.total - right.total;
}

function isPricedStore(entry: { store: RouteStoreKey; price: number | undefined }): entry is {
  store: RouteStoreKey;
  price: number;
} {
  return Number.isFinite(entry.price);
}

function sortStorePrice(
  left: { store: RouteStoreKey; price: number },
  right: { store: RouteStoreKey; price: number }
) {
  return left.price - right.price;
}

function isCompleteStoreTotal(store: StoreCartTotal): store is StoreCartTotal & { total: number } {
  return store.total !== null;
}

function isShoppingRoutePlan(plan: ShoppingRoutePlan | null): plan is ShoppingRoutePlan {
  return plan !== null;
}

function buildPlanForStores(
  items: ShoppingRouteItem[],
  stores: RouteStoreKey[],
  startingCoordinates: Coordinates,
  storeCoordinates: Record<RouteStoreKey, Coordinates>,
  costPerKm: number,
  bestSingleStorePurchaseCost: number | null
): ShoppingRoutePlan | null {
  const allocations = createEmptyAllocations();

  for (const item of items) {
    const bestStore = stores
      .map((store) => ({ store, price: item.prices[store] }))
      .filter(isPricedStore)
      .sort(sortStorePrice)[0];

    if (!bestStore) {
      return null;
    }

    const subtotal = round(bestStore.price * item.quantity);
    allocations[bestStore.store].total = round(allocations[bestStore.store].total + subtotal);
    allocations[bestStore.store].items.push({
      itemId: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: bestStore.price,
      subtotal,
    });
  }

  const usedStores = stores.filter((store) => allocations[store].items.length > 0);
  const route = optimizeStoreVisitOrder(startingCoordinates, usedStores, storeCoordinates);
  const distance = roundDistance(routeDistanceKm(startingCoordinates, route, storeCoordinates));
  const penalty = round(distance * costPerKm);
  const purchaseCost = round(usedStores.reduce((sum, store) => sum + allocations[store].total, 0));

  return {
    type: usedStores.length === 1 ? "single-store" : "split-two-stores",
    stores: usedStores,
    route,
    distanceKm: distance,
    travelPenalty: penalty,
    purchaseCost,
    adjustedTotal: round(purchaseCost + penalty),
    savingsVsBestSingleStore:
      bestSingleStorePurchaseCost === null ? 0 : round(bestSingleStorePurchaseCost - purchaseCost),
    allocations,
  };
}

export function recommendShoppingRoute(
  items: ShoppingRouteItem[],
  startingCoordinates: Coordinates,
  options: {
    costPerKm?: number;
    storeCoordinates?: Record<RouteStoreKey, Coordinates>;
  } = {}
): ShoppingRouteRecommendation {
  const costPerKm = options.costPerKm ?? 1;
  const storeCoordinates = options.storeCoordinates ?? defaultStoreCoordinates;
  const storeTotals = routeStoreKeys.map((store) => {
    const missingItems = items
      .filter((item) => !Number.isFinite(item.prices[store]))
      .map((item) => item.name);

    return {
      store,
      total:
        missingItems.length === 0
          ? round(items.reduce((sum, item) => sum + (item.prices[store] ?? 0) * item.quantity, 0))
          : null,
      complete: missingItems.length === 0,
      missingItems,
    };
  });
  const bestSingleStorePurchaseCost =
    storeTotals
      .filter(isCompleteStoreTotal)
      .sort(sortStoreTotalsByTotal)[0]?.total ?? null;
  const plans = buildStoreCombinations()
    .map((stores) =>
      buildPlanForStores(
        items,
        stores,
        startingCoordinates,
        storeCoordinates,
        costPerKm,
        bestSingleStorePurchaseCost
      )
    )
    .filter(isShoppingRoutePlan)
    .sort(sortPlansByAdjustedTotal);

  return {
    startingCoordinates,
    costPerKm,
    storeTotals,
    recommendation: plans[0] ?? null,
    plans,
  };
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
