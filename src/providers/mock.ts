import { mockProducts } from "@/data/mock-catalog";
import { normalizeProductName } from "@/lib/normalize-product";
import { Product, StoreKey, StoreProvider } from "@/providers/types";

function filterByStore(store: StoreKey) {
  return mockProducts.filter((product) => product.store === store);
}

export class MockStoreProvider implements StoreProvider {
  readonly reliability = "mock" as const;

  constructor(
    readonly store: StoreKey,
    readonly label: string
  ) {}

  async searchProducts(query: string) {
    const normalized = normalizeProductName(query);
    return filterByStore(this.store).filter((product) =>
      product.normalizedName.includes(normalized)
    );
  }

  async getProducts(): Promise<Product[]> {
    return filterByStore(this.store);
  }

  async getPromotions(): Promise<Product[]> {
    return filterByStore(this.store).filter((product) => product.promotion);
  }
}
