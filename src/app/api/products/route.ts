import { productWithLatestPrice, toApiProduct } from "@/lib/api";
import db from "@/lib/db";
import { normalizeProductName } from "@/lib/normalize-product";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ products: [] });
  }

  const normalizedQuery = normalizeProductName(query);
  const products = await db.product.findMany({
    where: {
      available: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { normalizedName: { contains: normalizedQuery, mode: "insensitive" } },
        { brand: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: 32,
    ...productWithLatestPrice,
  });

  return NextResponse.json({
    products: products.flatMap((product) => {
      const mapped = toApiProduct(product);
      return mapped ? [mapped] : [];
    }),
  });
}
