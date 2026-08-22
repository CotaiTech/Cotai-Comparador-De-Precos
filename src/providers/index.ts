import { AmantinoProvider } from "@/providers/amantino";
import { BahamasProvider } from "@/providers/bahamas";
import { BhProvider } from "@/providers/bh";
import { SupermercadoEscolaProvider } from "@/providers/supermercado-escola";
import { StoreKey, StoreProvider } from "@/providers/types";

const providers: Record<StoreKey, StoreProvider> = {
  escola: new SupermercadoEscolaProvider(),
  amantino: new AmantinoProvider(),
  bh: new BhProvider(),
  bahamas: new BahamasProvider(),
};

export function getProvider(store: StoreKey) {
  return providers[store];
}

export function getProviders() {
  return Object.values(providers);
}
