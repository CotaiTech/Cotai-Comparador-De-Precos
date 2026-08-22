import { NextResponse } from "next/server";
import { getPlanning } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Faça login para acessar este relatório." }, { status: 401 });
  const { id } = await context.params;
  const planning = await getPlanning(user.id, id);
  if (!planning) return NextResponse.json({ message: "Relatório não encontrado." }, { status: 404 });
  return NextResponse.json({ planning, user });
}
