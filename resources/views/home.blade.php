@extends('layouts.app')

@section('title', $promotionsOnly ? 'Promoções · CotaÍ' : 'CotaÍ')

@section('content')
    @unless ($promotionsOnly)
        <section class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
                <div class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm">
                    ✓ Comparação rápida para o hackathon
                </div>
                <h1 class="mt-6 max-w-2xl text-5xl font-semibold tracking-tight text-slate-950">
                    Compare sua compra e economize.
                </h1>
                <p class="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                    Monte sua lista e descubra onde ela sai mais barata, com visão por supermercado, promoções e compra otimizada item a item.
                </p>
            </div>
            <div class="rounded-[36px] border border-black/5 bg-white p-6 shadow-lg">
                <div class="rounded-[28px] bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 text-white">
                    <p class="text-sm uppercase tracking-[0.24em] text-emerald-100">Fluxo principal</p>
                    <div class="mt-6 space-y-2 text-sm">
                        <p>1. Pesquise produtos</p>
                        <p>2. Adicione à lista</p>
                        <p>3. Defina quantidades</p>
                        <p>4. Compare supermercados</p>
                        <p>5. Descubra a melhor economia</p>
                    </div>
                    <div class="mt-6 rounded-2xl bg-white/10 px-4 py-4">
                        <p class="text-sm text-emerald-50">Itens na sua lista</p>
                        <p class="mt-1 text-3xl font-semibold">{{ collect($cart)->sum('quantity') }}</p>
                    </div>
                </div>
            </div>
        </section>
    @endunless

    <section class="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        @unless ($promotionsOnly)
            <div class="space-y-8">
                <section class="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm sm:p-8" id="buscar">
                    <h2 class="text-2xl font-semibold tracking-tight text-slate-950">Buscar arroz, leite, carne, refrigerante...</h2>
                    <form method="GET" action="{{ route('home') }}" class="mt-5 flex gap-3">
                        <input
                            type="text" name="query" value="{{ $query }}" minlength="2" required
                            placeholder="Buscar arroz, leite, carne, refrigerante..."
                            class="w-full rounded-2xl border border-black/8 bg-slate-50 px-5 py-3 outline-none focus:border-emerald-300 focus:bg-white"
                        >
                        <button type="submit" class="shrink-0 rounded-2xl bg-emerald-600 px-5 py-3 font-medium text-white transition hover:bg-emerald-700">Buscar</button>
                    </form>

                    @if ($query !== '')
                        <div class="mt-6">
                            @if ($searchResults->isEmpty())
                                <p class="rounded-2xl border border-dashed border-black/10 px-4 py-6 text-sm text-slate-500">
                                    Nenhum produto encontrado para essa busca.
                                </p>
                            @else
                                <div class="grid gap-4 md:grid-cols-2">
                                    @foreach ($searchResults as $product)
                                        @include('partials.product-card', ['product' => $product])
                                    @endforeach
                                </div>
                            @endif
                        </div>
                    @endif
                </section>

                @if ($comparison)
                    @include('partials.comparison-result', ['result' => $comparison])
                @endif
            </div>

            <aside class="rounded-[32px] border border-black/5 bg-white p-5 shadow-sm lg:sticky lg:top-24" id="carrinho">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <h2 class="text-2xl font-semibold tracking-tight text-slate-950">Minha lista</h2>
                        <p class="mt-1 text-sm text-slate-500">Monte sua compra antes de comparar.</p>
                    </div>
                    @if (count($cart) > 0)
                        <form method="POST" action="{{ route('cart.clear') }}">
                            @csrf
                            <button type="submit" class="text-sm text-slate-500 transition hover:text-slate-900">Limpar lista</button>
                        </form>
                    @endif
                </div>

                <div class="mt-6 space-y-3">
                    @forelse ($cart as $item)
                        <div class="rounded-2xl bg-slate-50 p-4">
                            <div class="flex items-start justify-between gap-4">
                                <div>
                                    <p class="font-medium text-slate-900">{{ $item['query'] }}</p>
                                    @if (!empty($item['price']))
                                        <p class="mt-1 text-sm text-slate-500">Último preço visto: {{ \App\Support\Format::currency($item['price']) }}</p>
                                    @endif
                                </div>
                                <form method="POST" action="{{ route('cart.remove', $item['id']) }}">
                                    @csrf
                                    <button type="submit" class="text-slate-400 transition hover:text-orange-600" aria-label="Remover">✕</button>
                                </form>
                            </div>

                            <div class="mt-4 flex items-center justify-between">
                                <div class="inline-flex items-center gap-2 rounded-2xl border border-black/8 bg-white p-1">
                                    <form method="POST" action="{{ route('cart.update', $item['id']) }}">
                                        @csrf
                                        <input type="hidden" name="delta" value="-1">
                                        <button type="submit" class="rounded-xl px-3 py-2 transition hover:bg-slate-100">−</button>
                                    </form>
                                    <span class="min-w-8 text-center text-sm font-semibold text-slate-900">{{ $item['quantity'] }}</span>
                                    <form method="POST" action="{{ route('cart.update', $item['id']) }}">
                                        @csrf
                                        <input type="hidden" name="delta" value="1">
                                        <button type="submit" class="rounded-xl px-3 py-2 transition hover:bg-slate-100">+</button>
                                    </form>
                                </div>
                                <p class="text-sm text-slate-500">{{ $item['quantity'] }} unidade(s)</p>
                            </div>
                        </div>
                    @empty
                        <div class="rounded-2xl border border-dashed border-black/10 px-4 py-8 text-center text-sm text-slate-500">
                            Adicione produtos para comparar sua compra.
                        </div>
                    @endforelse
                </div>

                <form method="POST" action="{{ route('cart.compare') }}" class="mt-6">
                    @csrf
                    <button
                        type="submit"
                        @if (count($cart) === 0) disabled @endif
                        class="w-full rounded-[22px] bg-emerald-600 px-4 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        Comparar minha compra
                    </button>
                </form>
            </aside>
        @endunless
    </section>

    <section class="space-y-6" id="promocoes">
        <div>
            <p class="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Promoções encontradas</p>
            <h2 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Ofertas em destaque para sua lista</h2>
        </div>

        @if ($promotions->isEmpty())
            <p class="rounded-2xl border border-dashed border-black/10 px-4 py-6 text-sm text-slate-500">Nenhuma promoção encontrada no momento.</p>
        @else
            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                @foreach ($promotions as $product)
                    @include('partials.product-card', ['product' => $product])
                @endforeach
            </div>
        @endif
    </section>

    @unless ($promotionsOnly)
        <section class="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm">
            <p class="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Como funciona</p>
            <div class="mt-6 grid gap-4 md:grid-cols-3">
                <div class="rounded-[24px] bg-slate-50 p-5">
                    <h3 class="text-xl font-semibold tracking-tight text-slate-950">1. Monte sua lista</h3>
                    <p class="mt-3 text-sm leading-6 text-slate-600">Pesquise os produtos que precisa comprar.</p>
                </div>
                <div class="rounded-[24px] bg-slate-50 p-5">
                    <h3 class="text-xl font-semibold tracking-tight text-slate-950">2. Nós comparamos</h3>
                    <p class="mt-3 text-sm leading-6 text-slate-600">Comparamos os preços entre os supermercados.</p>
                </div>
                <div class="rounded-[24px] bg-slate-50 p-5">
                    <h3 class="text-xl font-semibold tracking-tight text-slate-950">3. Você economiza</h3>
                    <p class="mt-3 text-sm leading-6 text-slate-600">Descubra onde sua compra sai mais barata.</p>
                </div>
            </div>
        </section>
    @endunless
@endsection
