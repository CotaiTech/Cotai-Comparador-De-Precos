"use client";

import { Minus, Plus, ShoppingCart as ShoppingCartIcon, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export type CartViewItem = {
  id: string;
  query: string;
  quantity: number;
  latestKnownPrice?: number;
};

type ShoppingCartProps = {
  items: CartViewItem[];
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCompare: () => void;
  isComparing: boolean;
};

export function ShoppingCart({
  items,
  onIncrease,
  onDecrease,
  onRemove,
  onClear,
  onCompare,
  isComparing,
}: ShoppingCartProps) {
  return (
    <aside className="rounded-[32px] border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(16,34,21,0.06)] lg:sticky lg:top-24">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShoppingCartIcon className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Minha lista</h2>
          <p className="mt-1 text-sm text-slate-500">Monte sua compra antes de comparar.</p>
        </div>
        {items.length > 0 ? (
          <button type="button" onClick={onClear} className="text-sm text-slate-500 transition hover:text-slate-900">
            Limpar lista
          </button>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 px-4 py-8 text-center text-sm text-slate-500">
            Adicione produtos para comparar sua compra.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">{item.query}</p>
                  {item.latestKnownPrice ? (
                    <p className="mt-1 text-sm text-slate-500">Último preço visto: {formatCurrency(item.latestKnownPrice)}</p>
                  ) : null}
                </div>
                <button type="button" onClick={() => onRemove(item.id)} className="text-slate-400 transition hover:text-orange-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-black/8 bg-white p-1">
                  <button type="button" onClick={() => onDecrease(item.id)} className="rounded-xl px-3 py-2 transition hover:bg-slate-100">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-8 text-center text-sm font-semibold text-slate-900">{item.quantity}</span>
                  <button type="button" onClick={() => onIncrease(item.id)} className="rounded-xl px-3 py-2 transition hover:bg-slate-100">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-500">{item.quantity} unidade(s)</p>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={onCompare}
        disabled={items.length === 0 || isComparing}
        className="mt-6 w-full rounded-[22px] bg-emerald-600 px-4 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isComparing ? "Comparando supermercados..." : "Comparar minha compra"}
      </button>
    </aside>
  );
}
