import type { CompareResult } from "@/lib/compare-cart";
import type { StoreKey } from "@/providers/types";

export type DietPreference = "sem-restricao" | "vegetariana" | "vegana";

export type AccountProfile = {
  contactName: string;
  role: string;
  city: string;
  address: string;
  cuisineType: string;
  dietPreference: DietPreference;
  averageMonthlySpend: number;
  fuelPrice: number;
  vehicleKmPerLiter: number;
  storeDistances: Record<StoreKey, number>;
  completed: boolean;
};

export type Subscription = {
  plan: "CotaÍ Pro";
  price: number;
  status: "demo";
};

export type RadarItem = {
  id: string;
  query: string;
  createdAt: string;
};

export type SavedPlanning = {
  id: string;
  name: string;
  createdAt: string;
  items: Array<{ query: string; quantity: number }>;
  result: CompareResult;
};

export type AccountUser = {
  id: string;
  restaurantName: string;
  email: string;
  profile: AccountProfile;
  subscription: Subscription;
};

export const defaultStoreDistances: Record<StoreKey, number> = {
  escola: 3.2,
  amantino: 5.4,
  bh: 7.1,
  bahamas: 4.8,
};

export function createDefaultProfile(): AccountProfile {
  return {
    contactName: "",
    role: "Gestor(a)",
    city: "Viçosa - MG",
    address: "",
    cuisineType: "Restaurante",
    dietPreference: "sem-restricao",
    averageMonthlySpend: 0,
    fuelPrice: 6.19,
    vehicleKmPerLiter: 10,
    storeDistances: { ...defaultStoreDistances },
    completed: false,
  };
}
