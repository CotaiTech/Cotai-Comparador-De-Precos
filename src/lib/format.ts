import { format } from "date-fns";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDateLabel(date: string, source: "real" | "mock") {
  if (source === "mock") {
    return "Preço demonstrativo";
  }

  return `Preço consultado em ${format(new Date(date), "dd/MM 'às' HH:mm")}`;
}
