"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  FileCheck2,
  LoaderCircle,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CompareResult, PurchaseOptionSelection } from "@/lib/compare-cart";
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
  const [selectedOption, setSelectedOption] = useState<PurchaseOptionSelection>({
    id: "optimized",
    type: "optimized",
    label: "Compra otimizada",
    total: result.optimized.total,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const router = useRouter();
  const selectedTotal = selectedOption.total;
  const selectedIsOptimized = selectedOption.id === "optimized";

  function missingItemsForStore(store: (typeof storeKeys)[number]) {
    return result.lines
      .filter((line) => !line.stores[store].found)
      .map((line) => line.query);
  }

  async function savePlanning() {
    if (!user) { router.push("/login"); return; }
    setSaving(true);
    setSaveError("");
    const response = await fetch("/api/plannings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: planningName, items: result.lines.map((line) => ({ query: line.query, quantity: line.quantity })), result: { ...result, selectedOption } }) });
    const data = (await response.json()) as { planning?: { id: string }; message?: string };
    setSaving(false);
    if (!response.ok || !data.planning) { setSaveError(data.message ?? "Não foi possível salvar o planejamento."); return; }
    router.push(`/relatorios/${data.planning.id}`);
  }

  return (
    <section className="space-y-6" id="comparacao">
      <div className="rounded-[32px] border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(16,34,21,0.06)] sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr_0.85fr]">
          <div className="rounded-[24px] border border-slate-950 bg-slate-950 p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-300">Opção escolhida</p>
                <h3 className="text-xl font-semibold tracking-tight">{selectedOption.label}</h3>
              </div>
            </div>
            <p className="mt-5 text-4xl font-semibold tracking-tight">
              {formatCurrency(selectedTotal)}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {selectedIsOptimized
                ? "Menor preço por produto entre as lojas disponíveis."
                : "Esta será a opção salva no planejamento."}
            </p>
          </div>

          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-emerald-700">Melhor loja completa</p>
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  {result.winner.store ? storeMeta[result.winner.store].label : "Sem vencedor"}
                </h3>
              </div>
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
              {result.winner.total !== null ? formatCurrency(result.winner.total) : "Indisponível"}
            </p>
            <p className="mt-2 text-sm text-emerald-800">
              {result.winner.store
                ? `Economia: ${formatCurrency(result.winner.savings)} (${result.winner.savingsPercentage}%).`
                : "Nenhuma loja encontrou todos os itens."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedOption({ id: "optimized", type: "optimized", label: "Compra otimizada", total: result.optimized.total })}
            className={`rounded-[24px] border p-5 text-left transition ${
              selectedOption.id === "optimized"
                ? "border-slate-950 bg-white shadow-[0_16px_34px_rgba(15,23,42,0.12)]"
                : "border-slate-200 bg-slate-50 hover:border-emerald-500"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Compra otimizada</p>
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  Melhor preço por item
                </h3>
              </div>
              {selectedOption.id === "optimized" ? (
                <CheckCircle2 className="h-5 w-5 text-slate-950" />
              ) : null}
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
              {formatCurrency(result.optimized.total)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {result.optimized.savingsVsBestComplete > 0
                ? `Economiza ${formatCurrency(result.optimized.savingsVsBestComplete)} vs. melhor loja completa.`
                : "Usa os menores subtotais encontrados por produto."}
            </p>
          </button>
        </div>
      </div>

      {user ? <RouteScenarios result={result} profile={user.profile} selectedOptionId={selectedOption.id} onSelect={setSelectedOption} /> : <div className="rounded-[28px] border border-dashed border-emerald-300 bg-emerald-50/60 p-6"><h3 className="font-semibold text-emerald-900">Calcule o custo do deslocamento</h3><p className="mt-2 text-sm text-emerald-800">Entre na sua conta e informe as distâncias para comparar compra, combustível e tempo de rota.</p></div>}

      <div className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(16,34,21,0.06)]">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Compra em uma loja</p>
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">Totais por supermercado</h3>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {storeKeys.map((store) => {
            const summary = result.stores[store];
            const meta = storeMeta[store];
            const selected = selectedOption.id === `single-${store}`;
            const missingItems = missingItemsForStore(store);
            return (
              <button
                key={store}
                type="button"
                onClick={() =>
                  summary.complete &&
                  setSelectedOption({
                    id: `single-${store}`,
                    type: "single-store",
                    label: `Compra completa em ${meta.label}`,
                    store,
                    total: summary.total,
                  })
                }
                disabled={!summary.complete}
                className={`rounded-[24px] border p-5 text-left transition ${
                  selected
                    ? "border-slate-950 bg-white shadow-[0_16px_34px_rgba(15,23,42,0.12)]"
                    : `${meta.accent} ${summary.complete ? "hover:border-slate-400" : "cursor-not-allowed opacity-80"}`
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-sm font-semibold ${meta.color}`}>{meta.label}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                      {formatCurrency(summary.total)}
                    </p>
                  </div>
                  {selected ? <CheckCircle2 className="h-5 w-5 text-slate-950" /> : null}
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {summary.foundItems} de {summary.requestedItems} produtos encontrados
                </p>
                {!summary.complete ? (
                  <div className="mt-3 rounded-2xl bg-orange-50 px-3 py-2 text-sm text-orange-800">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      Faltam {summary.missingItems} item(ns)
                    </div>
                    <p className="mt-1 text-xs leading-5">
                      {missingItems.slice(0, 3).join(", ")}
                      {missingItems.length > 3 ? ` +${missingItems.length - 3}` : ""}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-medium text-emerald-700">Compra completa</p>
                )}
                {selected ? <p className="mt-3 text-xs font-semibold text-slate-950">Selecionado para salvar</p> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(16,34,21,0.06)]">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Distribuição otimizada</p>
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">Onde comprar cada grupo</h3>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-xl"><p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">Concluir planejamento</p><h3 className="mt-2 text-2xl font-semibold">Salve esta compra e acompanhe sua economia.</h3><p className="mt-2 text-sm text-slate-300">Opção escolhida: {selectedOption.label}. Isso não realiza pedidos nem pagamentos.</p></div><div className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-xl"><input value={planningName} onChange={(event) => setPlanningName(event.target.value)} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 outline-none focus:border-emerald-400" /><button onClick={savePlanning} disabled={saving || planningName.trim().length < 2} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-400 disabled:opacity-60">{saving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <><FileCheck2 className="h-5 w-5" />{user ? "Concluir e gerar relatório" : "Entrar para salvar"}</>}</button></div></div>
        {saveError ? <p className="mt-4 text-sm text-orange-300">{saveError}</p> : null}
      </div>
    </section>
  );
}
