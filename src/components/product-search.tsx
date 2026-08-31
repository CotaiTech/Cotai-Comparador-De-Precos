"use client";

import { useEffect, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Product } from "@/providers/types";
import { ProductCard } from "@/components/product-card";

type ProductSearchProps = {
  onAdd: (product: Product) => void;
  getCartQuantity?: (product: Product) => number;
  onIncrease?: (product: Product) => void;
  onDecrease?: (product: Product) => void;
  initialQuery?: string;
  onTrack?: (product: Product) => void;
};

export function ProductSearch({
  onAdd,
  getCartQuantity,
  onIncrease,
  onDecrease,
  initialQuery = "",
  onTrack,
}: ProductSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (query.trim().length < 2) {
      setProducts([]);
      setError("");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products?query=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Falha ao buscar produtos.");
        }
        const data = (await response.json()) as { products: Product[] };
        setProducts(data.products);
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
  }, [query]);

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
          <label className="flex items-center gap-3 rounded-[24px] border border-black/8 bg-slate-50 px-5 py-4 ring-0 transition focus-within:border-emerald-300 focus-within:bg-white focus-within:shadow-lg">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar arroz, leite, carne, refrigerante..."
              className="w-full border-0 bg-transparent text-lg outline-none placeholder:text-slate-400"
            />
          </label>
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
      ) : null}
    </section>
  );
}
