import { describe, expect, it } from "vitest";
import {
  getProductSearchScore,
  paginateProducts,
  sortProductsBySearchRelevance,
} from "@/lib/product-search";
import { Product } from "@/providers/types";

function product(name: string): Product {
  return {
    id: name,
    store: "escola",
    name,
    normalizedName: name.toLowerCase(),
    price: 1,
    promotion: false,
    available: true,
    source: "real",
    updatedAt: "2026-08-31T00:00:00.000Z",
  };
}

describe("product search", () => {
  it("prioriza produtos que começam pelo termo buscado", () => {
    const result = sortProductsBySearchRelevance(
      [
        product("Biscoito de Leite 400g"),
        product("Doce de Leite 400g"),
        product("Leite Viçosa Tipo C 1L"),
        product("Leite Condensado 395g"),
      ],
      "leite"
    );

    expect(result.map((item) => item.name)).toEqual([
      "Leite Condensado 395g",
      "Leite Viçosa Tipo C 1L",
      "Biscoito de Leite 400g",
      "Doce de Leite 400g",
    ]);
  });

  it("encontra termos separados por palavra intermediária", () => {
    const leiteVicosa = product("Leite Viçosa Tipo C 1L");

    expect(getProductSearchScore(leiteVicosa, "leite 1l")).toBeGreaterThan(0);
    expect(
      sortProductsBySearchRelevance(
        [product("Biscoito de Leite 400g"), leiteVicosa],
        "leite 1l"
      )[0]
    ).toBe(leiteVicosa);
  });

  it("expõe metadados para carregar próximas páginas", () => {
    const products = [product("Leite A"), product("Leite B"), product("Leite C")];

    expect(paginateProducts(products, 1, 2)).toMatchObject({
      products: products.slice(0, 2),
      page: 1,
      limit: 2,
      total: 3,
      hasMore: true,
      nextPage: 2,
    });

    expect(paginateProducts(products, 2, 2)).toMatchObject({
      products: products.slice(2),
      hasMore: false,
      nextPage: null,
    });
  });
});
