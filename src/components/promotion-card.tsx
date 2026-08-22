import { BellPlus, Flame, Plus } from "lucide-react";
import { Product } from "@/providers/types";
import { formatCurrency } from "@/lib/format";
import { storeMeta } from "@/lib/store";

type PromotionCardProps = {
  product: Product;
  onAdd: (product: Product) => void;
  onTrack?: (product: Product) => void;
};

export function PromotionCard({ product, onAdd, onTrack }: PromotionCardProps) {
  const meta = storeMeta[product.store];

  return (
    <article className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(16,34,21,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${meta.accent} ${meta.color}`}>
          {meta.label}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
          <Flame className="h-3.5 w-3.5" />
          {product.discountPercentage}% OFF
        </span>
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{product.name}</h3>
      <p className="mt-2 text-sm text-slate-500">{product.brand ?? "Oferta selecionada"}</p>
      <div className="mt-6">
        {product.originalPrice ? (
          <p className="text-sm text-slate-400">
            De: <span className="line-through">{formatCurrency(product.originalPrice)}</span>
          </p>
        ) : null}
        <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          {formatCurrency(product.price)}
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => onAdd(product)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"><Plus className="h-4 w-4" />Adicionar à lista</button>
        {onTrack ? <button type="button" onClick={() => onTrack(product)} title="Acompanhar no Radar" className="rounded-2xl bg-emerald-50 p-3 text-emerald-700 transition hover:bg-emerald-100"><BellPlus className="h-4 w-4" /></button> : null}
      </div>
    </article>
  );
}
