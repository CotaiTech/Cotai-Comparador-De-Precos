import { compareCart } from "@/lib/compare-cart";
import { storeKeys } from "@/lib/store";
import { getProviders } from "@/providers";

export async function searchAllStores(query: string) {
  const providers = getProviders();
  const results = await Promise.all(providers.map((provider) => provider.searchProducts(query)));
  const perStore = results.map((items) =>
    [...items].sort((a, b) => {
      if (a.source !== b.source) {
        return a.source === "real" ? -1 : 1;
      }
      return a.price - b.price;
    })
  );

  return interleave(perStore, 8);
}

export async function getAllPromotions() {
  const providers = getProviders();
  const results = await Promise.all(providers.map((provider) => provider.getPromotions()));

  return results
    .flat()
    .sort((a, b) => (b.discountPercentage ?? 0) - (a.discountPercentage ?? 0));
}

export async function compareQueries(items: Array<{ query: string; quantity: number }>) {
  const providers = getProviders();
  const productsByStoreEntries = await Promise.all(
    providers.map(async (provider) => [provider.store, await provider.getProducts()] as const)
  );

  const productsByStore = Object.fromEntries(productsByStoreEntries) as Record<
    (typeof storeKeys)[number],
    Awaited<ReturnType<(typeof providers)[number]["getProducts"]>>
  >;

  return compareCart(items, productsByStore);
}

function interleave<T>(groups: T[][], takePerGroup: number) {
  const limitedGroups = groups.map((group) => group.slice(0, takePerGroup));
  const max = Math.max(...limitedGroups.map((group) => group.length), 0);
  const merged: T[] = [];

  for (let index = 0; index < max; index += 1) {
    for (const group of limitedGroups) {
      if (group[index]) {
        merged.push(group[index]);
      }
    }
  }

  return merged;
}
