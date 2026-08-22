import localRealProducts from "@/data/products.json";
import { mockProducts } from "@/data/mock-catalog";
import { normalizeProductName } from "@/lib/normalize-product";
import { Product, StoreProvider } from "@/providers/types";

const escolaMockProducts = mockProducts.filter((product) => product.store === "escola");
const realSeed = localRealProducts as Product[];
const categoryMap: Record<string, string> = {
  arroz: "https://supermercadoescola.org.br/categoria/arroz",
  leite: "https://supermercadoescola.org.br/categoria/leites",
  feijao: "https://supermercadoescola.org.br/categoria/feij-o",
  cafe: "https://supermercadoescola.org.br/categoria/caf-s",
  refrigerante: "https://supermercadoescola.org.br/categoria/refrigerantes",
  queijo: "https://supermercadoescola.org.br/categoria/queijos",
  manteiga: "https://supermercadoescola.org.br/categoria/manteiga",
};

async function fetchLiveProducts(query?: string): Promise<Product[]> {
  const normalizedQuery = query ? normalizeProductName(query) : "";
  const target =
    (normalizedQuery && categoryMap[normalizedQuery]) ||
    (query
      ? `https://supermercadoescola.org.br/catalogsearch/result/?q=${encodeURIComponent(query)}`
      : "https://supermercadoescola.org.br/");

  try {
    const response = await fetch(target, {
      next: { revalidate: 60 * 30 },
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const itemRegex =
      /<a[^>]*product-item-link[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>[\s\S]*?<span class="price">R\$\s*([\d.,]+)<\/span>/g;
    const imageRegex = /<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"/g;
    const images = new Map<string, string>();
    for (const match of html.matchAll(imageRegex)) {
      images.set(normalizeProductName(match[2]), match[1]);
    }

    const products: Product[] = [];
    for (const match of html.matchAll(itemRegex)) {
      const name = match[2].replace(/<[^>]+>/g, " ").trim();
      const normalizedName = normalizeProductName(name);
      const price = Number(match[3].replace(/\./g, "").replace(",", "."));

      products.push({
        id: `escola-live-${normalizedName}`,
        store: "escola",
        name,
        normalizedName,
        price,
        promotion: false,
        available: true,
        imageUrl: images.get(normalizedName),
        productUrl: match[1],
        source: "real",
        updatedAt: new Date().toISOString(),
      });
    }

    return products;
  } catch {
    return [];
  }
}

export class SupermercadoEscolaProvider implements StoreProvider {
  readonly store = "escola" as const;
  readonly label = "Supermercado Escola";
  readonly reliability = "hybrid" as const;

  async searchProducts(query: string): Promise<Product[]> {
    const normalized = normalizeProductName(query);
    const live = await fetchLiveProducts(query);
    const seedResults = realSeed.filter((product) => product.normalizedName.includes(normalized));
    const mockResults = escolaMockProducts.filter((product) =>
      product.normalizedName.includes(normalized)
    );

    return dedupeProducts([...live, ...seedResults, ...mockResults]).slice(0, 12);
  }

  async getProducts(): Promise<Product[]> {
    const live = await fetchLiveProducts();
    return dedupeProducts([...realSeed, ...live, ...escolaMockProducts]);
  }

  async getPromotions(): Promise<Product[]> {
    return dedupeProducts([...realSeed, ...escolaMockProducts]).filter((product) => product.promotion);
  }
}

function dedupeProducts(products: Product[]) {
  const map = new Map<string, Product>();
  for (const product of products) {
    const key = `${product.normalizedName}-${product.packageText ?? ""}-${product.source}`;
    if (!map.has(key)) {
      map.set(key, product);
    }
  }
  return [...map.values()];
}
