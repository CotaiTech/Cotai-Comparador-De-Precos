@php
    $stores = \App\Support\Stores::KEYS;
    $meta = \App\Support\Stores::META;
@endphp
<section class="space-y-6" id="comparacao">
    <div class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div class="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm">
            <p class="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Sua compra</p>
            <div class="mt-4 grid gap-4 md:grid-cols-2">
                @foreach ($stores as $store)
                    @php $summary = $result['stores'][$store]; @endphp
                    <div class="rounded-[26px] border p-5 {{ $meta[$store]['accent'] }}">
                        <p class="text-sm font-semibold {{ $meta[$store]['color'] }}">{{ $meta[$store]['label'] }}</p>
                        <p class="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{{ \App\Support\Format::currency($summary['total']) }}</p>
                        <p class="mt-2 text-sm text-slate-600">{{ $summary['foundItems'] }} de {{ $summary['requestedItems'] }} produtos encontrados</p>
                        @unless ($summary['complete'])
                            <p class="mt-2 text-sm font-medium text-orange-700">Compra incompleta nesta loja</p>
                        @endunless
                    </div>
                @endforeach
            </div>
        </div>

        <div class="rounded-[32px] border border-emerald-200 bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 text-white shadow-sm">
            <p class="text-sm text-emerald-100">Melhor opção</p>
            <h3 class="text-2xl font-semibold tracking-tight">
                {{ $result['winner']['store'] ? $meta[$result['winner']['store']]['label'] : 'Sem vencedor da compra completa' }}
            </h3>
            <p class="mt-6 text-4xl font-semibold tracking-tight">
                {{ $result['winner']['total'] !== null ? \App\Support\Format::currency($result['winner']['total']) : 'Indisponível' }}
            </p>
            <p class="mt-3 text-sm text-emerald-50">
                @if ($result['winner']['store'])
                    Você economiza {{ \App\Support\Format::currency($result['winner']['savings']) }} ({{ $result['winner']['savingsPercentage'] }}% mais barato).
                @else
                    Algumas lojas não encontraram todos os itens, então não declaramos vencedor da compra completa.
                @endif
            </p>
        </div>
    </div>

    <div class="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-500">Compra otimizada</p>
        <h3 class="text-2xl font-semibold tracking-tight text-slate-950">Economia máxima por produto</h3>

        <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            @foreach ($stores as $store)
                @php $allocation = $result['optimized']['allocations'][$store]; @endphp
                <div class="rounded-[24px] bg-slate-50 p-5">
                    <p class="font-semibold text-slate-900">{{ $meta[$store]['label'] }}</p>
                    <p class="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{{ \App\Support\Format::currency($allocation['total']) }}</p>
                    <p class="mt-2 text-sm text-slate-500">{{ $allocation['items'] }} produtos</p>
                </div>
            @endforeach

            <div class="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 md:col-span-2 xl:col-span-1">
                <p class="font-semibold text-emerald-700">Total otimizado</p>
                <p class="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{{ \App\Support\Format::currency($result['optimized']['total']) }}</p>
                <p class="mt-2 text-sm text-emerald-800">Economia máxima: {{ \App\Support\Format::currency(max($result['optimized']['savingsVsBestComplete'], 0)) }}</p>
            </div>
        </div>
    </div>

    <div class="overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-sm">
        <div class="border-b border-black/5 px-6 py-5">
            <h3 class="text-2xl font-semibold tracking-tight text-slate-950">Comparação produto por produto</h3>
        </div>
        <div class="overflow-x-auto">
            <table class="min-w-full text-left text-sm">
                <thead class="bg-slate-50 text-slate-500">
                    <tr>
                        <th class="px-6 py-4 font-medium">Produto</th>
                        @foreach ($stores as $store)
                            <th class="px-6 py-4 font-medium">{{ $meta[$store]['label'] }}</th>
                        @endforeach
                        <th class="px-6 py-4 font-medium">Melhor preço</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($result['lines'] as $line)
                        <tr class="border-t border-black/5">
                            <td class="px-6 py-4">
                                <p class="font-medium text-slate-900">{{ $line['query'] }}</p>
                                <p class="text-slate-500">{{ $line['quantity'] }} unidade(s)</p>
                            </td>
                            @foreach ($stores as $store)
                                @php $entry = $line['stores'][$store]; @endphp
                                <td class="px-6 py-4">
                                    @if ($entry['subtotal'] !== null)
                                        <div class="{{ $line['bestStore'] === $store ? 'font-semibold text-emerald-700' : 'text-slate-700' }}">
                                            <p>{{ \App\Support\Format::currency($entry['subtotal']) }}</p>
                                            <p class="text-xs text-slate-500">{{ $entry['product']['name'] ?? '' }}</p>
                                        </div>
                                    @else
                                        <span class="text-orange-600">Não encontrado</span>
                                    @endif
                                </td>
                            @endforeach
                            <td class="px-6 py-4 font-medium text-slate-900">
                                {{ $line['bestStore'] ? $meta[$line['bestStore']]['label'] : 'Indisponível' }}
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
</section>
