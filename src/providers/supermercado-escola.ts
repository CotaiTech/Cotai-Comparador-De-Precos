import { scrapeSupermercadoEscolaProducts } from "@/scrapers/supermercado-escola";
import { Product, StoreProvider } from "@/providers/types";

export class SupermercadoEscolaProvider implements StoreProvider {
  readonly store = "escola" as const;
  readonly label = "Supermercado Escola";
  readonly reliability = "hybrid" as const;

  async searchProducts(query: string): Promise<Product[]> {
    return scrapeSupermercadoEscolaProducts({ query });
  }

  async getProducts(): Promise<Product[]> {
    return scrapeSupermercadoEscolaProducts();
  }

  async getPromotions(): Promise<Product[]> {
    return [];
  }
}
