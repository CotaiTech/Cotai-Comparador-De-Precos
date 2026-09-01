import { describe, expect, it } from "vitest";
import { compareCart } from "@/lib/compare-cart";
import {
  calculateProductSimilarity,
  findBestMatch,
  findClosestCanonicalProductId,
} from "@/lib/matching";
import {
  classifyProduct,
  classifyProductCategories,
  calculateStandardizedPricePerUnit,
  extractProductMeasure,
  normalizeProductName,
  normalizeProductNameForMatching,
} from "@/lib/normalize-product";
import { getProductSubtotal, getUnitPrice } from "@/lib/pricing";
import { Product, StoreKey } from "@/providers/types";

const updatedAt = "2026-08-22T14:32:00.000Z";

function product(
  store: StoreKey,
  key: string,
  name: string,
  price: number,
  options: Partial<Product> = {}
): Product {
  return {
    id: `${store}-mock-${key}`,
    store,
    name,
    normalizedName: normalizeProductName(name),
    price,
    promotion: false,
    available: true,
    source: "mock",
    updatedAt,
    ...options,
  };
}

const mockProducts: Product[] = [
  product("amantino", "refrigerante-coca-2l", "Refrigerante Coca-Cola 2L", 10.99, {
    brand: "Coca-Cola",
    quantity: 2,
    unit: "l",
    packageText: "2L",
  }),
  product("amantino", "agua-1-5l", "Água Mineral 1,5L", 3.29, {
    brand: "Minalba",
    quantity: 1.5,
    unit: "l",
    packageText: "1,5L",
  }),
  product("escola", "leite-1l", "Leite UHT Integral 1L", 5.69, {
    brand: "Itambé",
    quantity: 1,
    unit: "l",
    packageText: "1L",
  }),
  product("amantino", "papel-higienico-12un", "Papel Higiênico 12 Unidades", 21.9, {
    brand: "Neve",
    quantity: 12,
    unit: "un",
    packageText: "12un",
  }),
  product("escola", "papel-toalha-2un", "Papel Toalha 2 Unidades", 6.49, {
    brand: "Snob",
    quantity: 2,
    unit: "un",
    packageText: "2un",
  }),
  product("escola", "papel-higienico-12un", "Papel Higiênico 12 Unidades", 22.9, {
    brand: "Neve",
    quantity: 12,
    unit: "un",
    packageText: "12un",
  }),
  product("escola", "queijo-mussarela-500g", "Queijo Mussarela 500g", 24.95, {
    brand: "Viçosa",
    quantity: 500,
    unit: "g",
    packageText: "500g",
  }),
  ...(["escola", "amantino", "bh", "bahamas"] as const).flatMap((store) => [
    product(store, "arroz-5kg", "Arroz Tipo 1 5kg", {
      escola: 27.9,
      amantino: 25.9,
      bh: 26.49,
      bahamas: 24.99,
    }[store], {
      brand: "Camil",
      quantity: 5,
      unit: "kg",
      packageText: "5kg",
    }),
    product(store, "feijao-1kg", "Feijão Carioca 1kg", {
      escola: 8.49,
      amantino: 7.99,
      bh: 7.79,
      bahamas: 7.49,
    }[store], {
      brand: "Kicaldo",
      quantity: 1,
      unit: "kg",
      packageText: "1kg",
    }),
    product(store, "oleo-900ml", "Óleo de Soja 900ml", {
      escola: 8.79,
      amantino: 8.99,
      bh: 8.69,
      bahamas: 8.39,
    }[store], {
      brand: "Soya",
      quantity: 900,
      unit: "ml",
      packageText: "900ml",
    }),
    product(store, "manteiga-500g", "Manteiga Viçosa 500g", {
      escola: 18.9,
      amantino: 20.9,
      bh: 19.49,
      bahamas: 18.29,
    }[store], {
      brand: "Viçosa",
      quantity: 500,
      unit: "g",
      packageText: "500g",
    }),
    product(store, "alface-un", "Alface Crespa Unidade", {
      escola: 3.49,
      amantino: 2.99,
      bh: 2.79,
      bahamas: 2.49,
    }[store], {
      quantity: 1,
      unit: "un",
      packageText: "un",
    }),
  ]),
];

describe("normalizeProductName", () => {
  it("normaliza acentos, caixa e pontuação", () => {
    expect(normalizeProductName("COCA-COLA PET 2LT")).toBe("coca cola pet 2 l");
  });

  it("remove stop words para matching", () => {
    expect(normalizeProductNameForMatching("Molho de tomate com manjericão")).toBe(
      "molho tomate manjericao"
    );
  });
});

describe("extractProductMeasure", () => {
  it("extrai volume em litros", () => {
    expect(extractProductMeasure("Leite Integral 1L")).toEqual({
      quantity: 1,
      unit: "l",
      standardizedQuantity: 1,
      standardizedUnit: "l",
      packageText: "1l",
    });
  });

  it("extrai peso em gramas e padroniza para quilogramas", () => {
    expect(extractProductMeasure("Queijo Mussarela 500g")).toEqual({
      quantity: 500,
      unit: "g",
      standardizedQuantity: 0.5,
      standardizedUnit: "kg",
      packageText: "500g",
    });
  });

  it("extrai decimal com virgula", () => {
    expect(extractProductMeasure("Agua Mineral 1,5L")).toEqual({
      quantity: 1.5,
      unit: "l",
      standardizedQuantity: 1.5,
      standardizedUnit: "l",
      packageText: "1,5l",
    });
  });

  it("soma embalagem multipack", () => {
    expect(extractProductMeasure("Iogurte 2x500g")).toEqual({
      quantity: 1000,
      unit: "g",
      standardizedQuantity: 1,
      standardizedUnit: "kg",
      packageText: "1000g",
    });
  });
});

describe("calculateStandardizedPricePerUnit", () => {
  it("calcula preco por litro", () => {
    expect(calculateStandardizedPricePerUnit("Leite Integral 1L", 4.99)).toEqual({
      value: 4.99,
      unit: "l",
      quantity: 1,
      sourceQuantity: 1,
      sourceUnit: "l",
    });
  });

  it("calcula preco por quilograma", () => {
    expect(calculateStandardizedPricePerUnit("Queijo Mussarela 500g", 24.95)).toEqual({
      value: 49.9,
      unit: "kg",
      quantity: 0.5,
      sourceQuantity: 500,
      sourceUnit: "g",
    });
  });

  it("retorna null quando nao ha peso ou volume", () => {
    expect(calculateStandardizedPricePerUnit("Alface unidade", 2.49)).toBeNull();
  });
});

describe("calculateProductSimilarity", () => {
  const coca = mockProducts.find((product) => product.id === "amantino-mock-refrigerante-coca-2l")!;
  const agua = mockProducts.find((product) => product.id === "amantino-mock-agua-1-5l")!;
  const leite = mockProducts.find((product) => product.id === "escola-mock-leite-1l")!;
  const corteDeFrango = product("escola", "coxa-sobrecoxa-1kg", "Coxa Sobrecoxa Congelada 1kg", 12.9, {
    quantity: 1,
    unit: "kg",
    packageText: "1kg",
  });
  const papelHigienico = mockProducts.find(
    (product) => product.id === "amantino-mock-papel-higienico-12un"
  )!;

  it("encontra similaridade alta para o mesmo produto", () => {
    expect(calculateProductSimilarity("Coca Cola 2L", coca)).toBeGreaterThan(0.7);
  });

  it("penaliza embalagens incompatíveis", () => {
    expect(calculateProductSimilarity("Coca Cola 2L", agua)).toBeLessThan(0.45);
  });

  it("penaliza categoria conflitante", () => {
    expect(calculateProductSimilarity("Papel toalha 2un", papelHigienico)).toBe(0);
  });

  it("penaliza produto com base semantica diferente", () => {
    expect(calculateProductSimilarity("Leite condensado 395g", leite)).toBe(0);
  });

  it("aceita categoria ampla junto de produto especifico", () => {
    expect(calculateProductSimilarity("carne frango 1kg", corteDeFrango)).toBeGreaterThan(0.44);
  });
});

describe("classifyProduct", () => {
  it("identifica categorias diferentes para evitar falso positivo", () => {
    expect(classifyProduct("Papel toalha 2 unidades")).toBe("papel-toalha");
    expect(classifyProduct("Papel higiênico 12 unidades")).toBe("papel-higienico");
  });

  it("identifica mais de uma categoria quando a busca tem contexto amplo", () => {
    expect(classifyProductCategories("carne frango")).toEqual(["carne", "frango"]);
  });
});

describe("findBestMatch", () => {
  it("recusa match ambíguo entre embalagens e nomes próximos", () => {
    const result = findBestMatch("Papel toalha 2un", [
      mockProducts.find((product) => product.id === "escola-mock-papel-toalha-2un")!,
      mockProducts.find((product) => product.id === "escola-mock-papel-higienico-12un")!,
    ]);
    expect(result?.product.id).toBe("escola-mock-papel-toalha-2un");
  });
});

describe("findClosestCanonicalProductId", () => {
  const canonicalProducts = [
    { id: "arroz-5kg", name: "Arroz Tipo 1 5kg", normalizedName: "arroz tipo 1 5 kg" },
    { id: "coca-2l", name: "Refrigerante Coca-Cola 2L", normalizedName: "refrigerante coca cola 2 l" },
    { id: "molho-tomate", name: "Molho de Tomate Tradicional 300g" },
  ];

  it("retorna id canonico para nomes raspados com acentos, stop words e ordem diferente", () => {
    expect(findClosestCanonicalProductId("Coca Cola Refrigerante PET 2LT", canonicalProducts)).toBe(
      "coca-2l"
    );
  });

  it("aceita pequenas diferenças de digitação acima do limiar", () => {
    expect(findClosestCanonicalProductId("Refrogerante Coca Cola 2L", canonicalProducts)).toBe(
      "coca-2l"
    );
  });

  it("recusa nomes abaixo do limiar de similaridade", () => {
    expect(findClosestCanonicalProductId("Sabonete hidratante", canonicalProducts)).toBeNull();
  });
});

describe("pricing", () => {
  it("calcula subtotal do produto", () => {
    expect(getProductSubtotal(8.49, 3)).toBe(25.47);
  });

  it("calcula preço por kg", () => {
    const queijo = mockProducts.find((product) => product.id === "escola-mock-queijo-mussarela-500g")!;
    expect(getUnitPrice(queijo)).toEqual({ value: 49.9, unit: "kg" });
  });

  it("calcula preço por litro", () => {
    const oleo = mockProducts.find((product) => product.id === "escola-mock-oleo-900ml")!;
    expect(getUnitPrice(oleo)).toEqual({ value: 9.766666666666666, unit: "l" });
  });
});

describe("compareCart", () => {
  const comparisonProducts = mockProducts.filter((product) =>
    ["Arroz", "Feijão", "Óleo", "Manteiga", "Alface"].some((name) => product.name.includes(name))
  );
  const productsByStore = {
    escola: comparisonProducts.filter((product) => product.store === "escola"),
    amantino: comparisonProducts.filter((product) => product.store === "amantino"),
    bh: comparisonProducts.filter((product) => product.store === "bh"),
    bahamas: comparisonProducts.filter((product) => product.store === "bahamas"),
  };

  it("calcula total do carrinho", () => {
    const result = compareCart(
      [
        { query: "Arroz 5kg", quantity: 2 },
        { query: "Feijão 1kg", quantity: 1 },
      ],
      productsByStore
    );

    expect(result.stores.escola.total).toBe(64.29);
  });

  it("define supermercado vencedor quando ambos encontram tudo", () => {
    const result = compareCart(
      [
        { query: "Arroz 5kg", quantity: 2 },
        { query: "Feijão 1kg", quantity: 5 },
        { query: "Óleo 900ml", quantity: 3 },
      ],
      productsByStore
    );

    expect(result.winner.store).toBe("bahamas");
  });

  it("calcula economia em reais e percentual", () => {
    const result = compareCart([{ query: "Manteiga Viçosa 500g", quantity: 2 }], productsByStore);
    expect(result.winner.savings).toBe(1.22);
    expect(result.winner.savingsPercentage).toBe(3.2);
  });

  it("marca produto inexistente em uma loja como não encontrado", () => {
    const custom = {
      escola: productsByStore.escola.filter((product) => !product.name.includes("Alface")),
      amantino: productsByStore.amantino,
      bh: productsByStore.bh,
      bahamas: productsByStore.bahamas,
    };

    const result = compareCart([{ query: "Alface unidade", quantity: 1 }], custom);
    expect(result.stores.escola.foundItems).toBe(0);
    expect(result.stores.escola.complete).toBe(false);
    expect(result.winner.store).toBe("bahamas");
  });
});
