import { NextResponse } from "next/server";
import { z } from "zod";
import { updateUserProfile } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";
import { storeKeys } from "@/lib/store";

const profileSchema = z.object({
  restaurantName: z.string().trim().min(2),
  contactName: z.string().trim().min(2),
  role: z.string().trim().min(2),
  city: z.string().trim().min(2),
  address: z.string().trim(),
  cuisineType: z.string().trim().min(2),
  dietPreference: z.enum(["sem-restricao", "vegetariana", "vegana"]),
  averageMonthlySpend: z.number().min(0),
  fuelPrice: z.number().positive(),
  vehicleKmPerLiter: z.number().positive(),
  storeDistances: z.record(z.enum(storeKeys), z.number().min(0)),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Faça login para continuar." }, { status: 401 });

  const parsed = profileSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Revise os dados do perfil." }, { status: 400 });
  }

  const { restaurantName, ...profile } = parsed.data;
  const updated = await updateUserProfile(user.id, restaurantName, { ...profile, completed: true });
  return NextResponse.json({ user: updated });
}
