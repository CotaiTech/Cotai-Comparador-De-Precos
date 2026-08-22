import { NextResponse } from "next/server";
import { z } from "zod";
import { addPlanning, getPlannings } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Faça login para acessar seus relatórios." }, { status: 401 });
  return NextResponse.json({ plannings: await getPlannings(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Faça login para salvar o planejamento." }, { status: 401 });

  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    items: z.array(z.object({ query: z.string(), quantity: z.number().int().positive() })),
    result: z.record(z.string(), z.unknown()),
  }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ message: "Planejamento inválido." }, { status: 400 });

  const planning = await addPlanning(user.id, {
    name: parsed.data.name,
    items: parsed.data.items,
    result: parsed.data.result as never,
  });
  return NextResponse.json({ planning }, { status: 201 });
}
