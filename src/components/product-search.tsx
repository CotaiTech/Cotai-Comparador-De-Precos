"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { Product, StoreKey } from "@/providers/types";
import { ProductCard } from "@/components/product-card";
import { storeKeys, storeMeta } from "@/lib/store";

type ProductSearchResponse = {
  products: Product[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  nextPage: number | null;
};

type ProductSearchProps = {
  onAdd: (product: Product) => void;
  getCartQuantity?: (product: Product) => number;
  onIncrease?: (product: Product) => void;
  onDecrease?: (product: Product) => void;
  initialQuery?: string;
  clearSignal?: number;
  onTrack?: (product: Product) => void;
};

export function ProductSearch({
  onAdd,
  getCartQuantity,
  onIncrease,
  onDecrease,
  initialQuery = "",
  clearSignal = 0,
  onTrack,
}: ProductSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedStores, setSelectedStores] = useState<StoreKey[]>([...storeKeys]);
  const selectedStoresParam = selectedStores.join(",");

  useEffect(() => {
    if (clearSignal > 0) {
      setQuery("");
      setFiltersOpen(false);
    }
  }, [clearSignal]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setProducts([]);
      setError("");
      setPage(1);
      setTotal(0);
      setHasMore(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          query,
          page: "1",
          stores: selectedStoresParam,
        });
        const response = await fetch(`/api/products?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error("Falha ao buscar produtos.");
        }
        const data = (await response.json()) as ProductSearchResponse;
        setProducts(data.products);
        setPage(data.page);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setError("");
      } catch (err) {
        if (!controller.signal.aborted) {
          setError("Não conseguimos atualizar os preços deste supermercado agora.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, selectedStoresParam]);

  async function loadMoreProducts() {
    if (!hasMore || loadingMore) {
      return;
    }

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const params = new URLSearchParams({
        query,
        page: String(nextPage),
        stores: selectedStoresParam,
      });
      const response = await fetch(`/api/products?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Falha ao buscar produtos.");
      }

      const data = (await response.json()) as ProductSearchResponse;
      setProducts((current) => [...current, ...data.products]);
      setPage(data.page);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setError("");
    } catch {
      setError("Não conseguimos carregar mais produtos agora.");
    } finally {
      setLoadingMore(false);
    }
  }

  function toggleStore(store: StoreKey) {
    setSelectedStores((current) => {
      if (current.includes(store)) {
        return current.length === 1 ? current : current.filter((item) => item !== store);
      }

      return storeKeys.filter((item) => item === store || current.includes(item));
    });
  }

  return (
    <section className="space-y-6" id="buscar">
      <div className="rounded-[32px] border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(16,34,21,0.06)] sm:p-8">
        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              <Sparkles className="h-4 w-4" />
              Busca inteligente
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              Buscar arroz, leite, carne, refrigerante...
            </h2>
          </div>
          <div className="relative flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 items-center gap-3 rounded-[24px] border border-black/8 bg-slate-50 px-5 py-4 ring-0 transition focus-within:border-emerald-300 focus-within:bg-white focus-within:shadow-lg">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar arroz, leite, carne, refrigerante..."
                className="w-full border-0 bg-transparent text-lg outline-none placeholder:text-slate-400"
              />
            </label>
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className="inline-flex items-center justify-center gap-2 rounded-[24px] border border-black/8 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800"
            >
              <SlidersHorizontal className="h-5 w-5" />
              Filtros ({selectedStores.length})
            </button>
            {filtersOpen ? (
              <div className="absolute right-0 top-full z-20 mt-3 w-full rounded-[24px] border border-black/8 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.14)] sm:w-80">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-950">Supermercados</p>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    title="Fechar filtros"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  {storeKeys.map((store) => {
                    const meta = storeMeta[store];
                    const checked = selectedStores.includes(store);

                    return (
                      <label
                        key={store}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-black/5 px-4 py-3 transition hover:bg-slate-50"
                      >
                        <span>
                          <span className={`block text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                          <span className="text-xs text-slate-500">{checked ? "Aparece na busca" : "Oculto na busca"}</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStore(store)}
                          className="h-5 w-5 accent-emerald-600"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-[28px] bg-white/70" />
          ))}
        </div>
      ) : null}

      {error ? <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-700">{error}</p> : null}

      {!loading && query.trim().length >= 2 && products.length === 0 && !error ? (
        <p className="rounded-2xl border border-dashed border-black/10 px-4 py-6 text-sm text-slate-500">
          Nenhum produto encontrado para essa busca.
        </p>
      ) : null}

      {products.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={onAdd}
                cartQuantity={getCartQuantity?.(product) ?? 0}
                onIncrease={onIncrease}
                onDecrease={onDecrease}
                onTrack={onTrack}
              />
            ))}
          </div>
          {hasMore ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={loadMoreProducts}
                disabled={loadingMore}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {loadingMore ? "Carregando..." : `Ver mais produtos (${products.length}/${total})`}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
