"use client";

import { FormEvent, useEffect, useState } from "react";
import { BellRing, LoaderCircle, Plus, Radar, Trash2 } from "lucide-react";
import { RadarItem } from "@/lib/account-types";
import { Product } from "@/providers/types";
import { ProductCard } from "@/components/product-card";

const cartStorageKey = "compra-certa-cart";

export function RadarClient({ initialItems }: { initialItems: RadarItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Record<string, Product[]>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const entries = await Promise.all(items.map(async (item) => {
        const response = await fetch(`/api/products?query=${encodeURIComponent(item.query)}`);
        const data = (await response.json()) as { products: Product[] };
        return [item.id, data.products.filter((product) => product.promotion).slice(0, 2)] as const;
      }));
      if (active) {
        setMatches(Object.fromEntries(entries));
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [items]);

  async function addItem(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/radar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
    const data = (await response.json()) as { item?: RadarItem; message?: string };
    if (!response.ok || !data.item) { setMessage(data.message ?? "Não foi possível adicionar."); return; }
    setItems((current) => current.some((item) => item.id === data.item?.id) ? current : [data.item!, ...current]);
    setQuery("");
    setMessage("Produto adicionado ao seu radar.");
  }

  async function removeItem(id: string) {
    await fetch(`/api/radar?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function addToCart(product: Product) {
    const current = JSON.parse(localStorage.getItem(cartStorageKey) ?? "[]") as Array<{ id: string; query: string; quantity: number; latestKnownPrice: number }>;
    const existing = current.find((item) => item.query === product.name);
    const next = existing ? current.map((item) => item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item) : [{ id: `${product.id}-${Date.now()}`, query: product.name, quantity: 1, latestKnownPrice: product.price }, ...current];
    localStorage.setItem(cartStorageKey, JSON.stringify(next));
    setMessage(`${product.name} foi adicionado à sua lista.`);
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[34px] bg-slate-950 p-7 text-white sm:p-9">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500"><Radar className="h-6 w-6" /></div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Radar CotaÍ</h1>
        <p className="mt-3 max-w-2xl text-slate-300">Cadastre produtos de alto interesse e encontre rapidamente promoções relacionadas nos catálogos monitorados.</p>
        <form onSubmit={addItem} className="mt-7 flex flex-col gap-3 sm:flex-row"><input required minLength={2} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: queijo muçarela, arroz 5kg..." className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-white outline-none placeholder:text-slate-400 focus:border-emerald-400" /><button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-4 font-semibold hover:bg-emerald-400"><Plus className="h-5 w-5" />Adicionar ao radar</button></form>
      </section>

      {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}
      {loading ? <div className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Buscando oportunidades...</div> : null}
      {items.length === 0 ? <div className="rounded-[30px] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center"><BellRing className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-4 font-semibold">Seu radar ainda está vazio.</p><p className="mt-1 text-sm text-slate-500">Adicione os insumos que mais impactam sua operação.</p></div> : null}
      {items.map((item) => (
        <section key={item.id} className="rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Alto interesse</p><h2 className="mt-1 text-2xl font-semibold">{item.query}</h2></div><button onClick={() => removeItem(item.id)} title="Remover do radar" className="rounded-xl p-3 text-slate-400 hover:bg-orange-50 hover:text-orange-600"><Trash2 className="h-4 w-4" /></button></div>
          {(matches[item.id] ?? []).length > 0 ? <div className="mt-5 grid gap-4 lg:grid-cols-2">{matches[item.id].map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} />)}</div> : !loading ? <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">Nenhuma promoção relacionada foi encontrada agora. O item continua acompanhado.</p> : null}
        </section>
      ))}
    </div>
  );
}
