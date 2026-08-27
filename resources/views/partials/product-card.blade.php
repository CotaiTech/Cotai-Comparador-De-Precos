@php
    $meta = \App\Support\Stores::META[$product->store];
    $unitPrice = \App\Services\PricingService::getUnitPrice($product);
@endphp
<article class="flex h-full flex-col rounded-[28px] border border-black/5 bg-white p-5 shadow-sm">
    <span class="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium {{ $meta['accent'] }} {{ $meta['color'] }}">
        {{ $meta['label'] }}
    </span>
    <h3 class="mt-3 text-lg font-semibold tracking-tight text-slate-900">{{ $product->name }}</h3>
    <div class="mt-2 flex flex-wrap gap-2 text-sm text-slate-500">
        @if ($product->brand)<span>{{ $product->brand }}</span>@endif
        @if ($product->package_text)<span>{{ $product->package_text }}</span>@endif
        @if ($product->discount_percentage)
            <span class="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">-{{ $product->discount_percentage }}%</span>
        @endif
    </div>

    <div class="mt-auto pt-4">
        @if ($product->original_price)
            <p class="text-sm text-slate-400 line-through">{{ \App\Support\Format::currency($product->original_price) }}</p>
        @endif
        <p class="text-2xl font-semibold tracking-tight text-slate-950">{{ \App\Support\Format::currency($product->price) }}</p>
        @if ($unitPrice)
            <p class="mt-1 text-sm text-slate-500">{{ \App\Support\Format::currency($unitPrice['value']) }}/{{ $unitPrice['unit'] }}</p>
        @endif
        <p class="mt-2 text-xs text-slate-500">{{ \App\Support\Format::dateLabel($product->updated_at, $product->source) }}</p>

        <form method="POST" action="{{ route('cart.add') }}" class="mt-4">
            @csrf
            <input type="hidden" name="query" value="{{ $product->name }}">
            <input type="hidden" name="price" value="{{ $product->price }}">
            <button type="submit" class="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800">
                + Adicionar à lista
            </button>
        </form>
    </div>
</article>
