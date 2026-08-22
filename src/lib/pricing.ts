import { Product } from "@/providers/types";

export function getUnitPrice(product: Product) {
  if (!product.quantity || !product.unit) {
    return null;
  }

  if (product.unit === "kg" || product.unit === "l") {
    return {
      value: product.price / product.quantity,
      unit: product.unit,
    };
  }

  if (product.unit === "g") {
    return {
      value: product.price / (product.quantity / 1000),
      unit: "kg" as const,
    };
  }

  if (product.unit === "ml") {
    return {
      value: product.price / (product.quantity / 1000),
      unit: "l" as const,
    };
  }

  return {
    value: product.price / product.quantity,
    unit: "un" as const,
  };
}

export function getProductSubtotal(price: number, quantity: number) {
  return Number((price * quantity).toFixed(2));
}
