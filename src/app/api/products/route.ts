import { searchProductsPage } from "@/lib/api";
import { defaultProductSearchLimit, maxProductSearchLimit } from "@/lib/product-search";
import { storeKeys } from "@/lib/store";
import { StoreKey } from "@/providers/types";
import { NextRequest, NextResponse } from "next/server";

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseStores(value: string | null): StoreKey[] | undefined {
  if (!value) {
    return undefined;
  }

  const stores = value
    .split(",")
    .filter((store): store is StoreKey => storeKeys.includes(store as StoreKey));

  return stores.length > 0 ? [...new Set(stores)] : undefined;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  const page = parsePositiveInteger(request.nextUrl.searchParams.get("page"), 1);
  const requestedLimit = parsePositiveInteger(
    request.nextUrl.searchParams.get("limit"),
    defaultProductSearchLimit
  );
  const limit = Math.min(requestedLimit, maxProductSearchLimit);
  const stores = parseStores(request.nextUrl.searchParams.get("stores"));

  if (!query) {
    return NextResponse.json({
      products: [],
      page: 1,
      limit,
      total: 0,
      hasMore: false,
      nextPage: null,
    });
  }

  return NextResponse.json(await searchProductsPage(query, { page, limit, stores }));
}
