import { describe, expect, it } from "vitest";
import { parseReceiptText } from "@/lib/receipt-parser";

describe("parseReceiptText", () => {
  it("extrai produtos e preços de linhas simples", () => {
    expect(parseReceiptText("Arroz Tipo 1 5kg R$ 25,90\nÓleo de Soja 900ml 8,49")).toEqual([
      { name: "Arroz Tipo 1 5kg", quantity: 1, unitPrice: 25.9, total: 25.9 },
      { name: "Óleo de Soja 900ml", quantity: 1, unitPrice: 8.49, total: 8.49 },
    ]);
  });

  it("reconhece quantidade multiplicada", () => {
    expect(parseReceiptText("Feijão Carioca 2 x 7,99 R$ 15,98")[0]).toMatchObject({ name: "Feijão Carioca", quantity: 2, unitPrice: 7.99, total: 15.98 });
  });
});
