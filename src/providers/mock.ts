import { Product, StoreKey, StoreProvider } from "@/providers/types";

export class MockStoreProvider implements StoreProvider {
  readonly reliability = "mock" as const;

  constructor(
    readonly store: StoreKey,
    readonly label: string
  ) {}

  async searchProducts(): Promise<Product[]> {
    return [];
  }

  async getProducts(): Promise<Product[]> {
    return [];
  }

  async getPromotions(): Promise<Product[]> {
    return [];
  }
}
