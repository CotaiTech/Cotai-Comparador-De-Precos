import { Clock3, Fuel, MapPinned, Route } from "lucide-react";
import { AccountProfile } from "@/lib/account-types";
import { CompareResult } from "@/lib/compare-cart";
import { formatCurrency } from "@/lib/format";
import { calculateRouteScenarios } from "@/lib/route-optimizer";
import { storeMeta } from "@/lib/store";

const scenarioMeta = {
  rapida: { title: "Rota mais rápida", description: "Uma única parada com o melhor custo completo", icon: Clock3 },
  curta: { title: "Rota mais curta", description: "Menor deslocamento de ida e volta", icon: MapPinned },
  economica: { title: "Máxima economia real", description: "Produtos + estimativa de combustível", icon: Route },
};

export function RouteScenarios({ result, profile }: { result: CompareResult; profile: AccountProfile }) {
  const scenarios = calculateRouteScenarios(result, profile);
  return (
    <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(16,34,21,0.06)]">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Rotas e deslocamento</p><h3 className="mt-2 text-2xl font-semibold tracking-tight">Escolha o cenário da operação</h3></div><p className="text-xs text-slate-500">Estimativa com gasolina a {formatCurrency(profile.fuelPrice)}/L</p></div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {scenarios.map((scenario) => {
          const meta = scenarioMeta[scenario.id];
          const Icon = meta.icon;
          return <article key={scenario.id} className={`rounded-[24px] border p-5 ${scenario.id === "economica" ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}><Icon className={`h-5 w-5 ${scenario.id === "economica" ? "text-emerald-700" : "text-slate-600"}`} /><h4 className="mt-4 font-semibold text-slate-950">{meta.title}</h4><p className="mt-1 text-xs leading-5 text-slate-500">{meta.description}</p><p className="mt-4 text-2xl font-semibold">{formatCurrency(scenario.adjustedTotal)}</p><p className="mt-1 text-xs text-slate-500">Compra {formatCurrency(scenario.purchaseCost)} + trajeto {formatCurrency(scenario.travelCost)}</p><div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-white px-3 py-1.5">{scenario.distance.toFixed(1)} km</span><span className="rounded-full bg-white px-3 py-1.5">~{scenario.estimatedMinutes} min</span><span className="rounded-full bg-white px-3 py-1.5"><Fuel className="mr-1 inline h-3 w-3" />{scenario.stores.map((store) => storeMeta[store].label).join(" + ") || "Sem rota"}</span></div></article>;
        })}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">As distâncias são as informadas no perfil. O cálculo usa ida e volta e não inclui trânsito. Integração com mapas e preço oficial de combustível permanece como evolução futura.</p>
    </section>
  );
}
