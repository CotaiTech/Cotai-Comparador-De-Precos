<?php

namespace App\Http\Controllers;

use App\Services\CatalogService;
use App\Services\CompareCartService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CartController extends Controller
{
    public function add(Request $request)
    {
        $data = $request->validate([
            'query' => ['required', 'string', 'min:1'],
            'price' => ['nullable', 'numeric'],
        ]);

        $cart = session('cart', []);
        $existing = collect($cart)->first(fn ($item) => $item['query'] === $data['query']);

        if ($existing) {
            $cart = collect($cart)->map(function ($item) use ($existing) {
                if ($item['id'] === $existing['id']) {
                    $item['quantity']++;
                }

                return $item;
            })->all();
        } else {
            $cart[] = [
                'id' => (string) Str::uuid(),
                'query' => $data['query'],
                'quantity' => 1,
                'price' => $data['price'] ?? null,
            ];
        }

        session(['cart' => $cart]);
        session()->forget('comparison');

        return back()->with('status', "\"{$data['query']}\" adicionado à sua lista.");
    }

    public function update(Request $request, string $item)
    {
        $delta = (int) $request->input('delta', 0);

        $cart = collect(session('cart', []))->map(function ($cartItem) use ($item, $delta) {
            if ($cartItem['id'] === $item) {
                $cartItem['quantity'] = max(1, $cartItem['quantity'] + $delta);
            }

            return $cartItem;
        })->all();

        session(['cart' => $cart]);
        session()->forget('comparison');

        return back();
    }

    public function remove(string $item)
    {
        $cart = collect(session('cart', []))->reject(fn ($cartItem) => $cartItem['id'] === $item)->values()->all();

        session(['cart' => $cart]);
        session()->forget('comparison');

        return back();
    }

    public function clear()
    {
        session()->forget(['cart', 'comparison']);

        return back();
    }

    public function compare(CatalogService $catalog, CompareCartService $compareCartService)
    {
        $cart = session('cart', []);

        if (empty($cart)) {
            return back()->withErrors(['cart' => 'Adicione itens à sua lista antes de comparar.']);
        }

        $items = collect($cart)->map(fn ($item) => [
            'query' => $item['query'],
            'quantity' => $item['quantity'],
        ])->all();

        $result = $compareCartService->compareCart($items, $catalog->productsByStore());

        session(['comparison' => $compareCartService->toSessionArray($result)]);

        return redirect(route('home').'#comparacao');
    }
}
