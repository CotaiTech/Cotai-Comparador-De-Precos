import { DietPreference } from "@/lib/account-types";
import { normalizeProductName } from "@/lib/normalize-product";
import { Product } from "@/providers/types";

const meatTerms = ["carne", "frango", "linguica", "presunto", "peixe", "bacon", "costela", "picanha"];
const animalTerms = [...meatTerms, "leite", "queijo", "manteiga", "requeijao", "iogurte", "ovo"];

export function matchesDietPreference(product: Product, preference: DietPreference) {
  if (preference === "sem-restricao") return true;
  const normalized = normalizeProductName(product.name);
  const blockedTerms = preference === "vegana" ? animalTerms : meatTerms;
  return !blockedTerms.some((term) => normalized.includes(term));
}
