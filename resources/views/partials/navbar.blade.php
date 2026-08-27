<header class="sticky top-0 z-20 border-b border-black/5 bg-white/85 backdrop-blur-xl">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="{{ route('home') }}" class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                <span aria-hidden="true">🛒</span>
            </div>
            <div>
                <p class="font-semibold tracking-tight">CotaÍ</p>
                <p class="text-sm text-slate-500">Inteligência para compras</p>
            </div>
        </a>

        <nav class="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="{{ route('home') }}" class="transition hover:text-slate-950">Comparar</a>
            <a href="{{ route('promotions') }}" class="transition hover:text-slate-950">Promoções</a>
        </nav>

        @auth
            <div class="flex items-center gap-3">
                <span class="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 sm:flex">
                    {{ Str::limit(auth()->user()->name, 24) }}
                </span>
                <form method="POST" action="{{ route('logout') }}">
                    @csrf
                    <button type="submit" class="rounded-full p-2 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-950">Sair</button>
                </form>
            </div>
        @else
            <a href="{{ route('login') }}" class="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Entrar</a>
        @endauth
    </div>
</header>
