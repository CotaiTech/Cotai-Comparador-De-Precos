import Link from "next/link";
import { ArrowRight, FileBarChart, PiggyBank, ReceiptText } from "lucide-react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { getPlannings } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";
import { formatCurrency } from "@/lib/format";
import { calculateReportEconomy } from "@/lib/report-metrics";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const plannings = await getPlannings(user.id);
  const savings = plannings.reduce((sum, planning) => sum + calculateReportEconomy(planning.result).savings, 0);

  return <div className="min-h-screen pb-24 md:pb-0"><Navbar /><main className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><div className="rounded-[34px] bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 text-white"><FileBarChart className="h-8 w-8" /><p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">Histórico CotaÍ</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Resultados que viram decisão.</h1><div className="mt-7 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-white/10 p-5"><PiggyBank className="h-5 w-5" /><p className="mt-4 text-3xl font-semibold">{formatCurrency(savings)}</p><p className="text-sm text-emerald-100">Economia total planejada</p></div><div className="rounded-2xl bg-white/10 p-5"><ReceiptText className="h-5 w-5" /><p className="mt-4 text-3xl font-semibold">{plannings.length}</p><p className="text-sm text-emerald-100">Planejamentos concluídos</p></div></div></div><section className="mt-9"><div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">Planejamentos</h2><Link href="/" className="text-sm font-semibold text-emerald-700">Nova comparação</Link></div>{plannings.length === 0 ? <div className="mt-5 rounded-[28px] border border-dashed border-slate-300 bg-white/60 py-12 text-center"><p className="font-semibold">Nenhum planejamento concluído.</p><p className="mt-2 text-sm text-slate-500">Compare uma lista e use “Concluir e gerar relatório”.</p></div> : <div className="mt-5 grid gap-4 md:grid-cols-2">{plannings.map((planning) => { const economy = calculateReportEconomy(planning.result); return <Link key={planning.id} href={`/relatorios/${planning.id}`} className="group rounded-[26px] border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">{new Date(planning.createdAt).toLocaleDateString("pt-BR")}</p><h3 className="mt-2 text-xl font-semibold">{planning.name}</h3></div><ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-700" /></div><div className="mt-5 flex justify-between border-t pt-4 text-sm"><span className="text-slate-500">Total otimizado</span><strong>{formatCurrency(planning.result.optimized.total)}</strong></div><div className="mt-2 flex justify-between text-sm"><span className="text-slate-500">Economia vs. custo médio</span><strong className="text-emerald-700">{economy.available ? formatCurrency(economy.savings) : "Indisponível"}</strong></div></Link>; })}</div>}</section></main></div>;
}
