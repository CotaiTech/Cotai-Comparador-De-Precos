"use client";

import Link from "next/link";
import { FileBarChart, LogOut, Radar, ReceiptText, Search, ShoppingBasket, Tags, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const links = [
  { href: "/", label: "Comparar", icon: Search },
  { href: "/promocoes", label: "Promoções", icon: Tags },
  { href: "/radar", label: "Radar", icon: Radar },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { href: "/nota-fiscal", label: "Nota fiscal", icon: ReceiptText },
];

export function Navbar() {
  const [user, setUser] = useState<{ restaurantName: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { user: { restaurantName: string } | null }) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <ShoppingBasket className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold tracking-tight">CotaÍ</p>
            <p className="text-sm text-slate-500">Inteligência para compras</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-slate-950">
              {link.label}
            </Link>
          ))}
        </nav>
        {user ? (
          <div className="flex items-center gap-2">
            <Link href="/conta" className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 sm:flex">
              <UserRound className="h-4 w-4" />
              <span className="max-w-32 truncate">{user.restaurantName}</span>
            </Link>
            <button onClick={handleLogout} title="Sair" className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"><LogOut className="h-4 w-4" /></button>
          </div>
        ) : (
          <Link href="/login" className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Entrar</Link>
        )}
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-[22px] border border-white/60 bg-slate-950/95 p-1.5 text-white shadow-2xl backdrop-blur-xl md:hidden">
        {links.map((link) => { const Icon = link.icon; return <Link key={link.href} href={link.href} className="flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] text-slate-300 hover:bg-white/10 hover:text-white"><Icon className="h-4 w-4" /><span className="max-w-full truncate">{link.label}</span></Link>; })}
      </nav>
    </header>
  );
}
