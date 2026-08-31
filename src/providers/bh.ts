import { normalizeProductName } from "@/lib/normalize-product";
import { Product, StoreProvider } from "@/providers/types";
import { scrapeBhFlyers } from "@/scrapers/flyers";

export class BhProvider implements StoreProvider {
  readonly store = "bh" as const;
  readonly label = "Supermercados BH";
  readonly reliability = "hybrid" as const;

  async searchProducts(query: string): Promise<Product[]> {
    const normalized = normalizeProductName(query);
    const live = await this.getLiveProducts();
    const liveResults = live.filter((product) => product.normalizedName.includes(normalized));
    return dedupe(liveResults);
  }

  async getProducts(): Promise<Product[]> {
    const live = await this.getLiveProducts();
    return dedupe(live);
  }

  async getPromotions(): Promise<Product[]> {
    const live = await this.getLiveProducts();
    return live.filter((product) => product.promotion);
  }

  private async getLiveProducts() {
    try {
      return await scrapeBhFlyers();
    } catch (error) {
      console.error("Falha ao atualizar os folhetos do Supermercados BH:", error);
      return [];
    }
  }
}

function dedupe(products: Product[]) {
  const unique = new Map<string, Product>();
  for (const product of products) {
    const key = `${product.normalizedName}|${product.packageText ?? ""}`;
    if (!unique.has(key)) unique.set(key, product);
  }
  return [...unique.values()];
}
