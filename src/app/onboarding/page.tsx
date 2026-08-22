import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ProfileForm } from "@/components/profile-form";
import { getCurrentUser } from "@/lib/current-user";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Seu perfil CotaÍ</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Vamos personalizar sua experiência.</h1>
        <p className="mt-4 max-w-2xl text-slate-600">São poucos dados para deixar promoções e cálculos de deslocamento mais úteis para o seu restaurante.</p>
        <div className="mt-8"><ProfileForm restaurantName={user.restaurantName} initialProfile={user.profile} onboarding /></div>
      </main>
    </div>
  );
}
