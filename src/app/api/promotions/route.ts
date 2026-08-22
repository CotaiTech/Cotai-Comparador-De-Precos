import { getAllPromotions } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET() {
  const products = await getAllPromotions();
  return NextResponse.json({ products });
}
