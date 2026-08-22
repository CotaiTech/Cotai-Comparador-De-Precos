import { mockProducts } from "@/data/mock-catalog";
import { normalizeProductName } from "@/lib/normalize-product";
import { Product, StoreProvider } from "@/providers/types";
import { scrapeBahamasFlyers } from "@/scrapers/flyers";

const fallbackProducts = mockProducts.filter((product) => product.store === "bahamas");

export class BahamasProvider implements StoreProvider {
  readonly store = "bahamas" as const;
  readonly label = "Bahamas";
  readonly reliability = "hybrid" as const;

  async searchProducts(query: string): Promise<Product[]> {
    const normalized = normalizeProductName(query);
    const live = await this.getLiveProducts();
    const liveResults = live.filter((product) => product.normalizedName.includes(normalized));
    const fallbackResults = fallbackProducts.filter((product) =>
      product.normalizedName.includes(normalized)
    );
    return dedupe([...liveResults, ...fallbackResults]);
  }

  async getProducts(): Promise<Product[]> {
    const live = await this.getLiveProducts();
    return dedupe([...live, ...fallbackProducts]);
  }

  async getPromotions(): Promise<Product[]> {
    const live = await this.getLiveProducts();
    return live.length > 0 ? live : fallbackProducts.filter((product) => product.promotion);
  }

  private async getLiveProducts() {
    try {
      return await scrapeBahamasFlyers();
    } catch (error) {
      console.error("Falha ao atualizar os folhetos do Bahamas:", error);
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
