"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, Building2, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantName, email, password }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Não foi possível continuar.");

      router.push(mode === "register" ? "/onboarding" : "/");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível continuar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="hidden bg-emerald-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-3 text-lg font-semibold">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15"><Building2 className="h-5 w-5" /></span>
          CotaÍ
        </Link>
        <div className="max-w-md">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-100">Para restaurantes</p>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight">Mais controle para cada compra.</h1>
          <p className="mt-5 text-lg leading-8 text-emerald-50">A conta da sua empresa prepara o CotaÍ para salvar comparações, acompanhar economia e organizar o estoque nos próximos passos.</p>
        </div>
        <p className="text-sm text-emerald-100">Comece montando sua próxima lista de compras.</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-12 flex items-center gap-3 text-lg font-semibold lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white"><Building2 className="h-5 w-5" /></span>
            CotaÍ
          </Link>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Área da empresa</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{isRegister ? "Crie sua conta" : "Bem-vindo de volta"}</h2>
          <p className="mt-3 text-slate-600">{isRegister ? "Cadastre seu restaurante para começar a usar o CotaÍ." : "Entre para acessar as compras da sua empresa."}</p>

          <form className="mt-8 space-y-5" onSubmit={submit}>
            {isRegister ? (
              <label className="block text-sm font-medium text-slate-700">
                Nome do restaurante ou empresa
                <span className="relative mt-2 block"><Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input required value={restaurantName} onChange={(event) => setRestaurantName(event.target.value)} placeholder="Ex.: Bistrô Central" className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" /></span>
              </label>
            ) : null}
            <label className="block text-sm font-medium text-slate-700">
              E-mail
              <span className="relative mt-2 block"><Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="compras@seurestaurante.com" className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" /></span>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Senha
              <span className="relative mt-2 block"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input required type="password" minLength={6} autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? "Ao menos 6 caracteres" : "Sua senha"} className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" /></span>
            </label>
            {error ? <p role="alert" className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-700">{error}</p> : null}
            <button disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70">
              {isSubmitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <>{isRegister ? "Criar conta" : "Entrar"}<ArrowRight className="h-5 w-5" /></>}
            </button>
          </form>
          <p className="mt-7 text-center text-sm text-slate-600">
            {isRegister ? "Já possui uma conta?" : "Ainda não possui uma conta?"}{" "}
            <button type="button" onClick={() => { setMode(isRegister ? "login" : "register"); setError(""); }} className="font-semibold text-emerald-700 hover:text-emerald-800">{isRegister ? "Entrar" : "Criar conta"}</button>
          </p>
        </div>
      </main>
    </div>
  );
}
