import { describe, expect, it } from "vitest";
import { parseBahamasFlyerText, parseBhFlyerText } from "@/scrapers/flyers";

const updatedAt = "2026-08-23T12:00:00.000Z";
const bhFlyer = {
  id: "bh-test",
  title: "Folheto BH",
  pdfUrl: "https://example.com/bh.pdf",
};
const bahamasFlyer = {
  id: "bahamas-test",
  title: "Folheto Bahamas",
  pdfUrl: "https://example.com/bahamas.pdf",
};

describe("extração dos folhetos", () => {
  it("extrai preço atual, anterior, desconto e embalagem do BH", () => {
    const products = parseBhFlyerText(
      `Arroz Agulhinha
BH
Premium Tipo 1 Pcte. 5kg
16,80
17,90
cada
POR
DE`,
      bhFlyer,
      updatedAt
    );

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      store: "bh",
      price: 16.8,
      originalPrice: 17.9,
      discountPercentage: 6,
      quantity: 5,
      unit: "kg",
      source: "real",
    });
  });

  it("separa a repetição visual do produto anterior no Bahamas", () => {
    const products = parseBahamasFlyerText(
      `ÁGUA DE COCO
DUCOCO 1L
R$ 8,99
cada
ÁGUA DE COCO
DUCOCO 1L
R$
COCA-COLA
ORIGINAL OU ZERO AÇÚCAR
PET 1L
R$ 5,99
cada`,
      bahamasFlyer,
      updatedAt
    );

    expect(products).toHaveLength(2);
    expect(products[1].name).toBe("Coca-cola Original ou Zero Açúcar Pet 1l");
    expect(products[1]).toMatchObject({ price: 5.99, quantity: 1, unit: "l" });
  });

  it("descarta blocos contaminados por dois produtos diferentes", () => {
    const products = parseBahamasFlyerText(
      `FILÉ DE PEITO DE FRANGO AVE NOVA PACOTE KG
AÇÚCAR CRISTAL CORURIPE 5KG
R$ 11,49
cada`,
      bahamasFlyer,
      updatedAt
    );

    expect(products).toEqual([]);
  });

  it("não cria produtos para PDF sem texto comercial", () => {
    expect(parseBahamasFlyerText("-- 1 of 12 --", bahamasFlyer, updatedAt)).toEqual([]);
  });
});
