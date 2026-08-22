import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addRadarItem, getRadarItems, removeRadarItem } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Faça login para usar o Radar CotaÍ." }, { status: 401 });
  return NextResponse.json({ items: await getRadarItems(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Faça login para usar o Radar CotaÍ." }, { status: 401 });
  const parsed = z.object({ query: z.string().trim().min(2).max(100) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ message: "Informe um produto válido." }, { status: 400 });
  return NextResponse.json({ item: await addRadarItem(user.id, parsed.data.query) }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Faça login para continuar." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Item inválido." }, { status: 400 });
  await removeRadarItem(user.id, id);
  return NextResponse.json({ ok: true });
}
