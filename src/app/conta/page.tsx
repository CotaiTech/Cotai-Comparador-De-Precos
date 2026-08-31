import { BadgeCheck, BellRing, ChartNoAxesCombined, Crown, FileBarChart, MapPinned, Radar } from "lucide-react";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ProfileForm } from "@/components/profile-form";
import { getPlannings, getRadarItems } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";
import { formatCurrency } from "@/lib/format";
import { calculateReportEconomy } from "@/lib/report-metrics";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [plannings, radarItems] = await Promise.all([getPlannings(user.id), getRadarItems(user.id)]);
  const totalSavings = plannings.reduce((sum, item) => sum + calculateReportEconomy(item.result).savings, 0);

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Área da empresa</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">{user.restaurantName}</h1><p className="mt-2 text-slate-500">{user.email}</p></div>
          <div className="rounded-2xl bg-slate-950 px-5 py-3 text-white"><p className="flex items-center gap-2 text-sm font-semibold"><Crown className="h-4 w-4 text-amber-300" />{user.subscription.plan}</p><p className="mt-1 text-xs text-slate-300">{formatCurrency(user.subscription.price)}/mês</p></div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric icon={<ChartNoAxesCombined />} label="Economia planejada" value={formatCurrency(totalSavings)} />
          <Metric icon={<BadgeCheck />} label="Planejamentos" value={String(plannings.length)} />
          <Metric icon={<Radar />} label="Itens no radar" value={String(radarItems.length)} />
        </div>
        <section className="mt-8 rounded-[30px] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start"><div><p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-amber-800"><Crown className="h-4 w-4" />Plano ativo</p><h2 className="mt-3 text-2xl font-semibold">CotaÍ Pro por {formatCurrency(user.subscription.price)}/mês</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Recursos profissionais liberados para comparar compras, acompanhar oportunidades e gerar relatórios.</p></div><span className="w-fit rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">Recursos liberados</span></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3"><Benefit icon={<BellRing />} text="Radar de oportunidades" /><Benefit icon={<MapPinned />} text="Rotas com combustível" /><Benefit icon={<FileBarChart />} text="Histórico e relatórios" /></div>
        </section>
        <div className="mt-10"><ProfileForm restaurantName={user.restaurantName} initialProfile={user.profile} /></div>
      </main>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-[26px] border border-black/5 bg-white p-5 shadow-sm"><div className="h-5 w-5 text-emerald-700">{icon}</div><p className="mt-5 text-2xl font-semibold">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>;
}

function Benefit({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 text-sm font-semibold text-slate-700"><span className="h-4 w-4 text-emerald-700">{icon}</span>{text}</div>;
}
