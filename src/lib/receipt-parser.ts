export type ParsedReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

function parseMoney(value: string) {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

export function parseReceiptText(text: string): ParsedReceiptItem[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const totalMatch = line.match(/(?:R\$\s*)?(\d{1,6}(?:\.\d{3})*,\d{2})\s*$/i);
      if (!totalMatch || totalMatch.index === undefined) return [];

      const total = parseMoney(totalMatch[1]);
      const beforeTotal = line.slice(0, totalMatch.index).replace(/[-–.:]+$/, "").trim();
      const quantityMatch = beforeTotal.match(/(?:qtd\s*)?(\d+(?:[.,]\d+)?)\s*[xX]\s*(?:R\$\s*)?(\d+(?:[.,]\d{2})?)/i);
      const quantity = quantityMatch ? Number(quantityMatch[1].replace(",", ".")) : 1;
      const unitPrice = quantityMatch ? Number(quantityMatch[2].replace(",", ".")) : total;
      const name = beforeTotal
        .replace(/\b(?:cod|c[oó]digo|qtd|un|kg)\b.*$/i, "")
        .replace(/\d+(?:[.,]\d+)?\s*[xX]\s*(?:R\$\s*)?\d+(?:[.,]\d{2})?/i, "")
        .replace(/^\d+\s+/, "")
        .trim();

      if (name.length < 2 || /^(total|subtotal|troco|dinheiro|cart[aã]o|desconto)$/i.test(name)) return [];
      return [{ name, quantity, unitPrice, total }];
    });
}
