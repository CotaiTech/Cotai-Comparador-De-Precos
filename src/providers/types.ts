export type StoreKey = "escola" | "amantino" | "bh" | "bahamas";
export type ProductUnit = "g" | "kg" | "ml" | "l" | "un";
export type ProductSource = "real" | "mock";

export type Product = {
  id: string;
  store: StoreKey;
  externalId?: string;
  name: string;
  normalizedName: string;
  brand?: string;
  quantity?: number;
  unit?: ProductUnit;
  packageText?: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  promotion: boolean;
  available: boolean;
  imageUrl?: string;
  productUrl?: string;
  source: ProductSource;
  updatedAt: string;
};

export interface StoreProvider {
  readonly store: StoreKey;
  readonly label: string;
  readonly reliability: "real" | "hybrid" | "mock";
  searchProducts(query: string): Promise<Product[]>;
  getProducts(): Promise<Product[]>;
  getPromotions(): Promise<Product[]>;
}

export type CartItem = {
  id: string;
  query: string;
  quantity: number;
};
