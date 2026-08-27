@extends('layouts.app')

@section('title', 'Criar conta · CotaÍ')

@section('content')
    <div class="mx-auto w-full max-w-md">
        <p class="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Área da empresa</p>
        <h1 class="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Crie sua conta</h1>
        <p class="mt-3 text-slate-600">Cadastre seu restaurante para começar a usar o CotaÍ.</p>

        <form method="POST" action="{{ route('register') }}" class="mt-8 space-y-5">
            @csrf
            <label class="block text-sm font-medium text-slate-700">
                Nome do restaurante ou empresa
                <input type="text" name="name" value="{{ old('name') }}" required autofocus placeholder="Ex.: Bistrô Central"
                       class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
            </label>
            <label class="block text-sm font-medium text-slate-700">
                E-mail
                <input type="email" name="email" value="{{ old('email') }}" required autocomplete="email"
                       placeholder="compras@seurestaurante.com"
                       class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
            </label>
            <label class="block text-sm font-medium text-slate-700">
                Senha
                <input type="password" name="password" required minlength="6" autocomplete="new-password" placeholder="Ao menos 6 caracteres"
                       class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
            </label>
            <label class="block text-sm font-medium text-slate-700">
                Confirme a senha
                <input type="password" name="password_confirmation" required minlength="6" autocomplete="new-password"
                       class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
            </label>
            <button type="submit" class="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-700">
                Criar conta
            </button>
        </form>

        <p class="mt-7 text-center text-sm text-slate-600">
            Já possui uma conta?
            <a href="{{ route('login') }}" class="font-semibold text-emerald-700 hover:text-emerald-800">Entrar</a>
        </p>
    </div>
@endsection
