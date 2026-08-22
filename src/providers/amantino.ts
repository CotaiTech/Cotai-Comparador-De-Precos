import { mockProducts } from "@/data/mock-catalog";
import { normalizeProductName } from "@/lib/normalize-product";
import { scrapeAllAmantinoSeededProducts, scrapeAmantinoProducts } from "@/scrapers/amantino";
import { Product, StoreProvider } from "@/providers/types";

const amantinoMockProducts = mockProducts.filter((product) => product.store === "amantino");

export class AmantinoProvider implements StoreProvider {
  readonly store = "amantino" as const;
  readonly label = "Amantino";
  readonly reliability = "hybrid" as const;

  async searchProducts(query: string): Promise<Product[]> {
    const normalized = normalizeProductName(query);

    try {
      const liveProducts = await scrapeAmantinoProducts({ query, limit: 50 });
      if (liveProducts.length > 0) {
        return liveProducts;
      }
    } catch {
      // Falls back to local data if the live site is unavailable.
    }

    return amantinoMockProducts.filter((product) => product.normalizedName.includes(normalized));
  }

  async getProducts(): Promise<Product[]> {
    try {
      const liveProducts = await scrapeAllAmantinoSeededProducts();
      if (liveProducts.length > 0) {
        return liveProducts;
      }
    } catch {
      // Falls back to local data if the live site is unavailable.
    }

    return amantinoMockProducts;
  }

  async getPromotions(): Promise<Product[]> {
    try {
      const promotions = await scrapeAmantinoProducts({ promotionsOnly: true, limit: 80 });
      if (promotions.length > 0) {
        return promotions.filter((product) => product.promotion);
      }
    } catch {
      // Falls back to local data if the live site is unavailable.
    }

    return amantinoMockProducts.filter((product) => product.promotion);
  }
}
