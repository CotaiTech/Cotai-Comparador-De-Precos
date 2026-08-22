"use client";

import { useState } from "react";
import { BrainCircuit, FileCheck2, LoaderCircle, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { CompareResult } from "@/lib/compare-cart";
import { formatCurrency } from "@/lib/format";
import { storeKeys, storeMeta } from "@/lib/store";
import { AccountUser } from "@/lib/account-types";
import { RouteScenarios } from "@/components/route-scenarios";

type ComparisonResultProps = {
  result: CompareResult;
  user: AccountUser | null;
};

export function ComparisonResult({ result, user }: ComparisonResultProps) {
  const [planningName, setPlanningName] = useState(`Compra de insumos - ${new Date().toLocaleDateString("pt-BR")}`);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const router = useRouter();

  async function savePlanning() {
    if (!user) { router.push("/login"); return; }
    setSaving(true);
    setSaveError("");
    const response = await fetch("/api/plannings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: planningName, items: result.lines.map((line) => ({ query: line.query, quantity: line.quantity })), result }) });
    const data = (await response.json()) as { planning?: { id: string }; message?: string };
    setSaving(false);
    if (!response.ok || !data.planning) { setSaveError(data.message ?? "Não foi possível salvar o planejamento."); return; }
    router.push(`/relatorios/${data.planning.id}`);
  }

  return (
    <section className="space-y-6" id="comparacao">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(16,34,21,0.06)]">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Sua compra</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {storeKeys.map((store) => {
              const summary = result.stores[store];
              const meta = storeMeta[store];
              return (
                <div key={store} className={`rounded-[26px] border p-5 ${meta.accent}`}>
                  <p className={`text-sm font-semibold ${meta.color}`}>{meta.label}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    {formatCurrency(summary.total)}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {summary.foundItems} de {summary.requestedItems} produtos encontrados
                  </p>
                  {!summary.complete ? (
                    <p className="mt-2 text-sm font-medium text-orange-700">
                      Compra incompleta nesta loja
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[32px] border border-emerald-200 bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 text-white shadow-[0_18px_45px_rgba(22,101,52,0.22)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/15 p-3">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-emerald-100">Melhor opção</p>
              <h3 className="text-2xl font-semibold tracking-tight">
                {result.winner.store ? storeMeta[result.winner.store].label : "Sem vencedor da compra completa"}
              </h3>
            </div>
          </div>

          <p className="mt-6 text-4xl font-semibold tracking-tight">
            {result.winner.total !== null ? formatCurrency(result.winner.total) : "Indisponível"}
          </p>
          <p className="mt-3 text-sm text-emerald-50">
            {result.winner.store
              ? `Você economiza ${formatCurrency(result.winner.savings)} (${result.winner.savingsPercentage}% mais barato).`
              : "Algumas lojas não encontraram todos os itens, então não declaramos vencedor da compra completa."}
          </p>
        </div>
      </div>

      {user ? <RouteScenarios result={result} profile={user.profile} /> : <div className="rounded-[28px] border border-dashed border-emerald-300 bg-emerald-50/60 p-6"><h3 className="font-semibold text-emerald-900">Calcule o custo do deslocamento</h3><p className="mt-2 text-sm text-emerald-800">Entre na sua conta e informe as distâncias para comparar compra, combustível e tempo de rota.</p></div>}

      <div className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(16,34,21,0.06)]">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Compra otimizada</p>
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">Economia máxima por produto</h3>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {storeKeys.map((store) => (
            <div key={store} className="rounded-[24px] bg-slate-50 p-5">
              <p className="font-semibold text-slate-900">{storeMeta[store].label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                {formatCurrency(result.optimized.allocations[store].total)}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {result.optimized.allocations[store].items} produtos
              </p>
            </div>
          ))}

          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 md:col-span-2 xl:col-span-1">
            <p className="font-semibold text-emerald-700">Total otimizado</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              {formatCurrency(result.optimized.total)}
            </p>
            <p className="mt-2 text-sm text-emerald-800">
              Economia máxima: {formatCurrency(Math.max(result.optimized.savingsVsBestComplete, 0))}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-[0_18px_45px_rgba(16,34,21,0.06)]">
        <div className="border-b border-black/5 px-6 py-5">
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950">Comparação produto por produto</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Produto</th>
                {storeKeys.map((store) => (
                  <th key={store} className="px-6 py-4 font-medium">
                    {storeMeta[store].label}
                  </th>
                ))}
                <th className="px-6 py-4 font-medium">Melhor preço</th>
              </tr>
            </thead>
            <tbody>
              {result.lines.map((line) => (
                <tr key={line.query} className="border-t border-black/5">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{line.query}</p>
                    <p className="text-slate-500">{line.quantity} unidade(s)</p>
                  </td>
                  {storeKeys.map((store) => {
                    const entry = line.stores[store];
                    const isBest = line.bestStore === store;
                    return (
                      <td key={store} className="px-6 py-4">
                        {entry.subtotal !== null ? (
                          <div className={isBest ? "font-semibold text-emerald-700" : "text-slate-700"}>
                            <p>{formatCurrency(entry.subtotal)}</p>
                            <p className="text-xs text-slate-500">{entry.product?.name}</p>
                          </div>
                        ) : (
                          <span className="text-orange-600">Não encontrado</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {line.bestStore ? storeMeta[line.bestStore].label : "Indisponível"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-[32px] bg-slate-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-xl"><p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">Concluir planejamento</p><h3 className="mt-2 text-2xl font-semibold">Salve esta compra e acompanhe sua economia.</h3><p className="mt-2 text-sm text-slate-300">Isso não realiza pedidos nem pagamentos. O CotaÍ registra somente o planejamento.</p></div><div className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-xl"><input value={planningName} onChange={(event) => setPlanningName(event.target.value)} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 outline-none focus:border-emerald-400" /><button onClick={savePlanning} disabled={saving || planningName.trim().length < 2} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-400 disabled:opacity-60">{saving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <><FileCheck2 className="h-5 w-5" />{user ? "Concluir e gerar relatório" : "Entrar para salvar"}</>}</button></div></div>
        {saveError ? <p className="mt-4 text-sm text-orange-300">{saveError}</p> : null}
      </div>
    </section>
  );
}
