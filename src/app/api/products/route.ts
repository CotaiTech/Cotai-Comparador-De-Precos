import { searchAllStores } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ products: [] });
  }

  const products = await searchAllStores(query);
  return NextResponse.json({ products });
}
