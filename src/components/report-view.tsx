"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Download, FileText, LayoutList } from "lucide-react";
import { AccountUser, SavedPlanning } from "@/lib/account-types";
import { formatCurrency } from "@/lib/format";
import { storeKeys, storeMeta } from "@/lib/store";
import { calculateReportEconomy } from "@/lib/report-metrics";

export function ReportView({ planning, user }: { planning: SavedPlanning; user: AccountUser }) {
  const [mode, setMode] = useState<"resumido" | "completo">("resumido");
  const result = planning.result;
  const selectedOption = result.selectedOption;
  const selectedTotal = selectedOption?.total ?? result.optimized.total;
  const economy = calculateReportEconomy(result);

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="report-toolbar mx-auto mb-5 flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4">
        <Link href="/relatorios" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft className="h-4 w-4" />Histórico</Link>
        <div className="flex rounded-2xl bg-white p-1 shadow-sm"><button onClick={() => setMode("resumido")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === "resumido" ? "bg-slate-950 text-white" : "text-slate-600"}`}><FileText className="mr-2 inline h-4 w-4" />Resumido</button><button onClick={() => setMode("completo")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === "completo" ? "bg-slate-950 text-white" : "text-slate-600"}`}><LayoutList className="mr-2 inline h-4 w-4" />Completo</button></div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"><Download className="h-4 w-4" />Salvar em PDF</button>
      </div>

      <article className="report-page mx-auto max-w-5xl bg-white p-8 shadow-xl print:max-w-none print:p-0 print:shadow-none sm:p-12">
        <header className="flex items-start justify-between gap-5 border-b border-slate-900 pb-7"><div><p className="font-serif text-4xl tracking-tight">COTA<span className="text-emerald-700">Í</span></p><p className="mt-1 text-xs text-slate-500">Inteligência para suas compras</p></div><div className="text-right"><p className="text-sm font-bold uppercase text-emerald-800">Relatório {mode}</p><h1 className="mt-1 text-xl font-semibold">{planning.name}</h1><p className="mt-1 text-sm text-slate-500">{new Date(planning.createdAt).toLocaleString("pt-BR")}</p><p className="mt-2 text-sm font-medium">{user.restaurantName}</p></div></header>

        <section className="mt-8 grid gap-4 border border-slate-200 p-5 sm:grid-cols-3"><ReportMetric label={selectedOption?.label ?? "Valor otimizado"} value={formatCurrency(selectedTotal)} /><ReportMetric label="Economia estimada" value={economy.available ? formatCurrency(economy.savings) : "Indisponível"} green /><ReportMetric label="Economia percentual" value={economy.available ? `${economy.savingsPercentage.toFixed(1)}%` : "Indisponível"} green /></section>

        <section className="mt-9"><SectionTitle>Resumo da compra</SectionTitle><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-300 text-xs uppercase text-slate-500"><th className="py-3">Produto</th><th>Quantidade</th><th>Estabelecimento</th><th className="text-right">Subtotal</th></tr></thead><tbody>{result.lines.map((line) => { const entry = line.bestStore ? line.stores[line.bestStore] : null; return <tr key={line.query} className="border-b border-slate-100"><td className="py-3 font-medium">{line.query}</td><td>{line.quantity}</td><td>{line.bestStore ? storeMeta[line.bestStore].label : "Não encontrado"}</td><td className="text-right">{entry?.subtotal != null ? formatCurrency(entry.subtotal) : "-"}</td></tr>; })}</tbody><tfoot><tr className="font-bold"><td className="pt-4" colSpan={3}>Total da compra</td><td className="pt-4 text-right">{formatCurrency(result.optimized.total)}</td></tr></tfoot></table></div></section>

        <section className="mt-9 grid gap-7 border-t border-slate-200 pt-7 lg:grid-cols-2"><div><SectionTitle>Como o CotaÍ gerou economia?</SectionTitle><div className="mt-4 space-y-3 text-sm"><Line label="Custo médio estimado da lista" value={economy.referenceTotal !== null ? formatCurrency(economy.referenceTotal) : "Indisponível"} /><Line label="Estratégia CotaÍ - menor custo possível" value={formatCurrency(result.optimized.total)} /><div className="border-t pt-3"><Line label="Economia estimada" value={economy.available ? formatCurrency(economy.savings) : "Indisponível"} green /></div></div></div><div className="rounded-xl bg-emerald-50 p-5"><p className="text-sm font-bold text-emerald-800">Oportunidade encontrada</p><p className="mt-2 text-sm leading-6 text-emerald-950">{economy.available ? `A estratégia CotaÍ representa uma economia estimada de ${formatCurrency(economy.savings)} em comparação com o custo médio da lista, calculado pela média dos preços disponíveis de cada produto entre os supermercados.` : "Não foi possível calcular a economia porque pelo menos um item não foi encontrado em nenhum supermercado."}</p></div></section>

        {mode === "completo" ? <>
          <section className="report-break mt-10"><SectionTitle>Distribuição por estabelecimento</SectionTitle><div className="mt-4 grid gap-3 sm:grid-cols-2">{storeKeys.map((store) => <div key={store} className="border border-slate-200 p-4"><p className="font-semibold">{storeMeta[store].label}</p><p className="mt-2 text-2xl font-semibold text-emerald-800">{formatCurrency(result.optimized.allocations[store].total)}</p><p className="mt-1 text-xs text-slate-500">{result.optimized.allocations[store].items} produtos destinados</p></div>)}</div></section>
          <section className="mt-10"><SectionTitle>Comparativo total entre estabelecimentos</SectionTitle><table className="mt-4 w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-3">Estratégia</th><th>Itens encontrados</th><th className="text-right">Custo total</th></tr></thead><tbody><tr className="bg-emerald-50 font-semibold text-emerald-800"><td className="p-3">Estratégia CotaÍ</td><td>{result.lines.length}</td><td className="text-right">{formatCurrency(result.optimized.total)}</td></tr>{storeKeys.map((store) => <tr key={store} className="border-b"><td className="py-3">{storeMeta[store].label}</td><td>{result.stores[store].foundItems} de {result.stores[store].requestedItems}</td><td className="text-right">{result.stores[store].complete ? formatCurrency(result.stores[store].total) : "Compra incompleta"}</td></tr>)}</tbody></table></section>
          <section className="mt-10"><SectionTitle>Comparativo por produto</SectionTitle><div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead><tr className="border-b text-slate-500"><th className="py-3">Produto</th>{storeKeys.map((store) => <th key={store} className="px-2">{storeMeta[store].label}</th>)}</tr></thead><tbody>{result.lines.map((line) => <tr key={line.query} className="border-b"><td className="py-3 font-medium">{line.query}</td>{storeKeys.map((store) => <td key={store} className={`px-2 ${line.bestStore === store ? "font-bold text-emerald-700" : ""}`}>{line.stores[store].subtotal != null ? formatCurrency(line.stores[store].subtotal!) : "-"}</td>)}</tr>)}</tbody></table></div></section>
        </> : null}

        <footer className="mt-12 flex flex-wrap justify-between gap-3 border-t border-slate-300 pt-5 text-xs text-slate-500"><p>{result.lines.length} produtos analisados em {storeKeys.length} estabelecimentos.</p><p>Valores sujeitos à disponibilidade e alterações de preço.</p><p className="font-semibold text-emerald-800">cotai.com.br</p></footer>
      </article>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) { return <h2 className="border-b border-slate-300 pb-2 text-sm font-bold uppercase tracking-wide text-slate-800">{children}</h2>; }
function ReportMetric({ label, value, green = false }: { label: string; value: string; green?: boolean }) { return <div className="border-slate-200 sm:border-r sm:last:border-r-0"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className={`mt-3 text-3xl font-semibold ${green ? "text-emerald-800" : "text-slate-950"}`}>{value}</p></div>; }
function Line({ label, value, green = false }: { label: string; value: string; green?: boolean }) { return <div className="flex items-center justify-between gap-3"><span className={green ? "font-semibold" : "text-slate-600"}>{label}</span><strong className={green ? "text-lg text-emerald-800" : ""}>{value}</strong></div>; }
