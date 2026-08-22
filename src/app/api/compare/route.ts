import { compareQueries } from "@/lib/api";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const bodySchema = z.object({
  items: z.array(
    z.object({
      query: z.string().min(1),
      quantity: z.number().int().positive(),
    })
  ),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const result = await compareQueries(parsed.data.items);
  return NextResponse.json(result);
}
