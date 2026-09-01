import { scrapeAllAmantinoSeededProducts, scrapeAmantinoProducts } from "@/scrapers/amantino";
import { Product, StoreProvider } from "@/providers/types";

export class AmantinoProvider implements StoreProvider {
  readonly store = "amantino" as const;
  readonly label = "Amantino";
  readonly reliability = "hybrid" as const;

  async searchProducts(query: string): Promise<Product[]> {
    try {
      const liveProducts = await scrapeAmantinoProducts({ query, limit: 50 });
      if (liveProducts.length > 0) {
        return liveProducts;
      }
    } catch {
      // Live site unavailable.
    }

    return [];
  }

  async getProducts(): Promise<Product[]> {
    try {
      const liveProducts = await scrapeAllAmantinoSeededProducts();
      if (liveProducts.length > 0) {
        return liveProducts;
      }
    } catch {
      // Live site unavailable.
    }

    return [];
  }

  async getPromotions(): Promise<Product[]> {
    try {
      const promotions = await scrapeAmantinoProducts({ promotionsOnly: true, limit: 80 });
      if (promotions.length > 0) {
        return promotions.filter((product) => product.promotion);
      }
    } catch {
      // Live site unavailable.
    }

    return [];
  }
}
