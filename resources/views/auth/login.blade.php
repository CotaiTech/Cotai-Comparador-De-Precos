@extends('layouts.app')

@section('title', 'Entrar · CotaÍ')

@section('content')
    <div class="mx-auto w-full max-w-md">
        <p class="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Área da empresa</p>
        <h1 class="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Bem-vindo de volta</h1>
        <p class="mt-3 text-slate-600">Entre para acessar as compras da sua empresa.</p>

        <form method="POST" action="{{ route('login') }}" class="mt-8 space-y-5">
            @csrf
            <label class="block text-sm font-medium text-slate-700">
                E-mail
                <input type="email" name="email" value="{{ old('email') }}" required autofocus autocomplete="email"
                       placeholder="compras@seurestaurante.com"
                       class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
            </label>
            <label class="block text-sm font-medium text-slate-700">
                Senha
                <input type="password" name="password" required autocomplete="current-password" placeholder="Sua senha"
                       class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
            </label>
            <button type="submit" class="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-700">
                Entrar
            </button>
        </form>

        <p class="mt-7 text-center text-sm text-slate-600">
            Ainda não possui uma conta?
            <a href="{{ route('register') }}" class="font-semibold text-emerald-700 hover:text-emerald-800">Criar conta</a>
        </p>
    </div>
@endsection
