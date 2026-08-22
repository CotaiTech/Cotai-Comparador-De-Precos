"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, LoaderCircle, MapPin, Route, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { AccountProfile } from "@/lib/account-types";
import { storeKeys, storeMeta } from "@/lib/store";

export function ProfileForm({
  restaurantName: initialRestaurantName,
  initialProfile,
  onboarding = false,
}: {
  restaurantName: string;
  initialProfile: AccountProfile;
  onboarding?: boolean;
}) {
  const [restaurantName, setRestaurantName] = useState(initialRestaurantName);
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  function update<K extends keyof AccountProfile>(key: K, value: AccountProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantName, ...profile }),
    });
    const data = (await response.json()) as { message?: string };
    setSaving(false);

    if (!response.ok) {
      setMessage(data.message ?? "Não foi possível salvar o perfil.");
      return;
    }

    if (onboarding) {
      router.push("/");
      router.refresh();
    } else {
      setMessage("Perfil atualizado com sucesso.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(16,34,21,0.06)]">
        <div className="flex items-center gap-3"><Store className="h-5 w-5 text-emerald-700" /><h2 className="text-xl font-semibold">Dados da empresa</h2></div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Restaurante ou empresa"><input required value={restaurantName} onChange={(event) => setRestaurantName(event.target.value)} className={inputClass} /></Field>
          <Field label="Nome do responsável"><input required value={profile.contactName} onChange={(event) => update("contactName", event.target.value)} className={inputClass} /></Field>
          <Field label="Cargo"><input required value={profile.role} onChange={(event) => update("role", event.target.value)} className={inputClass} /></Field>
          <Field label="Tipo de cozinha"><input required value={profile.cuisineType} onChange={(event) => update("cuisineType", event.target.value)} placeholder="Restaurante, pizzaria, bar..." className={inputClass} /></Field>
          <Field label="Cidade"><input required value={profile.city} onChange={(event) => update("city", event.target.value)} className={inputClass} /></Field>
          <Field label="Endereço de partida"><input value={profile.address} onChange={(event) => update("address", event.target.value)} placeholder="Usado nas futuras rotas com mapas" className={inputClass} /></Field>
        </div>
      </section>

      <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(16,34,21,0.06)]">
        <h2 className="text-xl font-semibold">Preferências de compra</h2>
        <p className="mt-2 text-sm text-slate-500">Usamos esse perfil para priorizar promoções relevantes.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ["sem-restricao", "Sem restrições", "Todas as categorias"],
            ["vegetariana", "Vegetariana", "Sem carnes e pescados"],
            ["vegana", "Vegana", "Sem produtos de origem animal"],
          ].map(([value, label, description]) => (
            <button key={value} type="button" onClick={() => update("dietPreference", value as AccountProfile["dietPreference"])} className={`rounded-2xl border p-4 text-left transition ${profile.dietPreference === value ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-200"}`}>
              <span className="font-semibold text-slate-900">{label}</span><span className="mt-1 block text-xs text-slate-500">{description}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 max-w-sm"><Field label="Gasto médio mensal com insumos (R$)"><input type="number" min="0" step="100" value={profile.averageMonthlySpend} onChange={(event) => update("averageMonthlySpend", Number(event.target.value))} className={inputClass} /></Field></div>
      </section>

      <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(16,34,21,0.06)]">
        <div className="flex items-center gap-3"><Route className="h-5 w-5 text-emerald-700" /><h2 className="text-xl font-semibold">Deslocamento</h2></div>
        <p className="mt-2 text-sm text-slate-500">Enquanto mapas e combustível ao vivo não estão conectados, ajuste as distâncias e valores usados no cálculo.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Preço da gasolina (R$/L)"><input type="number" min="0.01" step="0.01" value={profile.fuelPrice} onChange={(event) => update("fuelPrice", Number(event.target.value))} className={inputClass} /></Field>
          <Field label="Consumo do veículo (km/L)"><input type="number" min="0.1" step="0.1" value={profile.vehicleKmPerLiter} onChange={(event) => update("vehicleKmPerLiter", Number(event.target.value))} className={inputClass} /></Field>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {storeKeys.map((store) => (
            <Field key={store} label={`Distância até ${storeMeta[store].label} (km)`}>
              <span className="relative block"><MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="number" min="0" step="0.1" value={profile.storeDistances[store]} onChange={(event) => update("storeDistances", { ...profile.storeDistances, [store]: Number(event.target.value) })} className={`${inputClass} pl-11`} /></span>
            </Field>
          ))}
        </div>
      </section>

      {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}
      <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-60">
        {saving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5" />{onboarding ? "Concluir e conhecer o CotaÍ" : "Salvar alterações"}</>}
      </button>
    </form>
  );
}

const inputClass = "mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700">{label}{children}</label>;
}
