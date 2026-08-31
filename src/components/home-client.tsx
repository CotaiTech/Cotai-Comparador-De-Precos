"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ProductSearch } from "@/components/product-search";
import { PromotionCard } from "@/components/promotion-card";
import { ShoppingCart, CartViewItem } from "@/components/shopping-cart";
import { ComparisonResult } from "@/components/comparison-result";
import { CompareResult } from "@/lib/compare-cart";
import { Product } from "@/providers/types";
import { AccountUser } from "@/lib/account-types";
import { matchesDietPreference } from "@/lib/personalization";
import { BrandIntro } from "@/components/brand-intro";
import { ProductTour } from "@/components/product-tour";

const storageKey = "compra-certa-cart";

export function HomeClient({
  promotionsOnly = false,
  compareOnly = false,
}: {
  promotionsOnly?: boolean;
  compareOnly?: boolean;
}) {
  const [cart, setCart] = useState<CartViewItem[]>([]);
  const [comparison, setComparison] = useState<CompareResult | null>(null);
  const [promotions, setPromotions] = useState<Product[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonError, setComparisonError] = useState("");
  const [user, setUser] = useState<AccountUser | null>(null);
  const [radarMessage, setRadarMessage] = useState("");
  const [searchClearSignal, setSearchClearSignal] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me").then((response) => response.json()).then((data: { user: AccountUser | null }) => setUser(data.user)).catch(() => null);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      setCart(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingPromotions(true);
        const response = await fetch("/api/promotions");
        const data = (await response.json()) as { products: Product[] };
        if (mounted) {
          setPromotions(data.products);
        }
      } finally {
        if (mounted) {
          setLoadingPromotions(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  function handleAdd(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.query === product.name);
      if (existing) {
        return current.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        {
          id: `${product.id}-${Date.now()}`,
          query: product.name,
          quantity: 1,
          latestKnownPrice: product.price,
        },
        ...current,
      ];
    });
  }

  function getCartQuantity(product: Product) {
    return cart.find((item) => item.query === product.name)?.quantity ?? 0;
  }

  function increaseProductQuantity(product: Product) {
    handleAdd(product);
  }

  function decreaseProductQuantity(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.query === product.name);

      if (!existing) {
        return current;
      }

      if (existing.quantity <= 1) {
        return current.filter((item) => item.id !== existing.id);
      }

      return current.map((item) =>
        item.id === existing.id ? { ...item, quantity: item.quantity - 1 } : item
      );
    });
  }

  async function handleTrack(product: Product) {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    const response = await fetch("/api/radar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: product.name }) });
    setRadarMessage(response.ok ? `${product.name} foi adicionado ao Radar CotaÍ.` : "Não foi possível adicionar ao radar agora.");
  }

  function updateQuantity(id: string, delta: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
        )
        .filter(Boolean)
    );
  }

  async function handleCompare() {
    try {
      setIsComparing(true);
      setComparisonError("");
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart.map(({ query, quantity }) => ({ query, quantity })),
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao comparar.");
      }

      const data = (await response.json()) as CompareResult;
      setComparison(data);
      setSearchClearSignal((current) => current + 1);
    } catch {
      setComparisonError("Não foi possível comparar sua lista agora.");
    } finally {
      setIsComparing(false);
    }
  }

  return (
    <div className="min-h-screen">
      {!promotionsOnly && !compareOnly ? <BrandIntro /> : null}
      {!promotionsOnly && !compareOnly ? <ProductTour enabled={Boolean(user?.profile.completed)} /> : null}
      <Navbar />

      <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        {radarMessage ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{radarMessage}</p> : null}

        {!promotionsOnly && !compareOnly ? (
          <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
                Comparação inteligente para compras
              </div>
              <h1 className="mt-6 max-w-2xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
                Compare sua compra e economize.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Monte sua lista e descubra onde ela sai mais barata, com visão por supermercado, promoções e compra otimizada item a item.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600">
                {["Busca em tempo real", "Compra otimizada", "Promoções encontradas", "Comparação por item"].map((item) => (
                  <span key={item} className="rounded-full border border-black/8 bg-white px-4 py-2">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[36px] border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(16,34,21,0.08)]">
              <div className="rounded-[28px] bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 text-white">
                <p className="text-sm uppercase tracking-[0.24em] text-emerald-100">Como funciona</p>
                <div className="mt-6 space-y-4">
                  {[
                    "Pesquise produtos",
                    "Adicione ao carrinho",
                    "Defina quantidades",
                    "Compare supermercados",
                    "Descubra a melhor economia",
                  ].map((item, index) => (
                    <div key={item} className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                      <span>{item}</span>
                      {index < 4 ? <ArrowRight className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl bg-white/10 px-4 py-4">
                  <p className="text-sm text-emerald-50">Itens na sua lista</p>
                  <p className="mt-1 text-3xl font-semibold">{totalItems}</p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          {!promotionsOnly ? (
            <div className="space-y-8">
              {!compareOnly ? (
                <ProductSearch
                  onAdd={handleAdd}
                  getCartQuantity={getCartQuantity}
                  onIncrease={increaseProductQuantity}
                  onDecrease={decreaseProductQuantity}
                  onTrack={handleTrack}
                  clearSignal={searchClearSignal}
                />
              ) : null}
              {comparisonError ? (
                <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-700">{comparisonError}</p>
              ) : null}
              {comparison ? <ComparisonResult result={comparison} user={user} /> : null}
            </div>
          ) : null}

          {!promotionsOnly ? (
            <ShoppingCart
              items={cart}
              onIncrease={(id) => updateQuantity(id, 1)}
              onDecrease={(id) => updateQuantity(id, -1)}
              onRemove={(id) => setCart((current) => current.filter((item) => item.id !== id))}
              onClear={() => setCart([])}
              onCompare={handleCompare}
              isComparing={isComparing}
            />
          ) : null}
        </section>

        <section className="space-y-6" id="promocoes">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Promoções encontradas</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Ofertas em destaque para sua lista</h2>
            </div>
          </div>

          {loadingPromotions ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-64 animate-pulse rounded-[28px] bg-white/70" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {promotions.filter((product) => !user || matchesDietPreference(product, user.profile.dietPreference)).slice(0, 6).map((product) => (
                <PromotionCard
                  key={product.id}
                  product={product}
                  onAdd={handleAdd}
                  cartQuantity={getCartQuantity(product)}
                  onIncrease={increaseProductQuantity}
                  onDecrease={decreaseProductQuantity}
                  onTrack={handleTrack}
                />
              ))}
            </div>
          )}
        </section>

        {!promotionsOnly && !compareOnly ? (
          <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(16,34,21,0.06)]">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Como funciona</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "1. Monte sua lista",
                  description: "Pesquise os produtos que precisa comprar.",
                },
                {
                  title: "2. Nós comparamos",
                  description: "Comparamos os preços entre os supermercados.",
                },
                {
                  title: "3. Você economiza",
                  description: "Descubra onde sua compra sai mais barata.",
                },
              ].map((step) => (
                <div key={step.title} className="rounded-[24px] bg-slate-50 p-5">
                  <h3 className="text-xl font-semibold tracking-tight text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
