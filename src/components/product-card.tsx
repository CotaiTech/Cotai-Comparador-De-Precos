import Image from "next/image";
import { BellPlus, Plus } from "lucide-react";
import { Product } from "@/providers/types";
import { formatCurrency, formatDateLabel } from "@/lib/format";
import { getUnitPrice } from "@/lib/pricing";
import { storeMeta } from "@/lib/store";

type ProductCardProps = {
  product: Product;
  onAdd: (product: Product) => void;
  onTrack?: (product: Product) => void;
};

export function ProductCard({ product, onAdd, onTrack }: ProductCardProps) {
  const meta = storeMeta[product.store];
  const unitPrice = getUnitPrice(product);

  return (
    <article className="flex h-full flex-col rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_18px_45px_rgba(16,34,21,0.06)]">
      <div className="mb-4 flex items-start gap-4">
        <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-slate-100">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">Sem imagem</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${meta.accent} ${meta.color}`}>
            {meta.label}
          </span>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">{product.name}</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500">
            {product.brand ? <span>{product.brand}</span> : null}
            {product.packageText ? <span>{product.packageText}</span> : null}
            {product.discountPercentage ? (
              <span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                -{product.discountPercentage}%
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <div>
          {product.originalPrice ? (
            <p className="text-sm text-slate-400 line-through">{formatCurrency(product.originalPrice)}</p>
          ) : null}
          <p className="text-2xl font-semibold tracking-tight text-slate-950">
            {formatCurrency(product.price)}
          </p>
          {unitPrice ? (
            <p className="mt-1 text-sm text-slate-500">
              {formatCurrency(unitPrice.value)}/{unitPrice.unit}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-slate-500">{formatDateLabel(product.updatedAt, product.source)}</p>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <button type="button" onClick={() => onAdd(product)} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"><Plus className="h-4 w-4 shrink-0" />Adicionar à lista</button>
          {onTrack ? <button type="button" onClick={() => onTrack(product)} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"><BellPlus className="h-4 w-4 shrink-0" />Acompanhar no Radar</button> : null}
        </div>
      </div>
    </article>
  );
}
