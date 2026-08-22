"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BellRing, MapPinned, Search, ShoppingBasket, X } from "lucide-react";

const steps = [
  { title: "Busque seus insumos", description: "Digite um produto, compare embalagens e adicione o item à lista.", icon: Search },
  { title: "Monte e compare", description: "Ajuste as quantidades e veja a compra completa ou otimizada.", icon: ShoppingBasket },
  { title: "Acompanhe oportunidades", description: "Use o Radar CotaÍ para seus produtos de alto interesse.", icon: BellRing },
  { title: "Considere o trajeto", description: "O custo de combustível entra na recomendação final de rota.", icon: MapPinned },
];

export function ProductTour({ enabled }: { enabled: boolean }) {
  const [step, setStep] = useState(-1);
  useEffect(() => {
    if (!enabled || localStorage.getItem("cotai-tour-seen-v1")) return;
    const timer = window.setTimeout(() => setStep(0), 2100);
    return () => window.clearTimeout(timer);
  }, [enabled]);
  if (step < 0) return null;
  const current = steps[step];
  const Icon = current.icon;
  function close() { localStorage.setItem("cotai-tour-seen-v1", "1"); setStep(-1); }
  return <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:items-center"><div className="w-full max-w-md rounded-[30px] bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Icon className="h-5 w-5" /></div><button onClick={close} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Passo {step + 1} de {steps.length}</p><h2 className="mt-2 text-2xl font-semibold">{current.title}</h2><p className="mt-3 leading-7 text-slate-600">{current.description}</p><div className="mt-7 flex items-center justify-between"><div className="flex gap-1.5">{steps.map((_, index) => <span key={index} className={`h-1.5 rounded-full transition-all ${index === step ? "w-7 bg-emerald-600" : "w-1.5 bg-slate-200"}`} />)}</div><button onClick={() => step === steps.length - 1 ? close() : setStep(step + 1)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">{step === steps.length - 1 ? "Começar" : "Próximo"}<ArrowRight className="h-4 w-4" /></button></div></div></div>;
}
