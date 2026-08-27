<?php

namespace App\Http\Controllers;

use App\Services\CatalogService;
use Illuminate\Http\Request;

class HomeController extends Controller
{
    public function __construct(private readonly CatalogService $catalog) {}

    public function index(Request $request)
    {
        return $this->render($request, promotionsOnly: false);
    }

    public function promotions(Request $request)
    {
        return $this->render($request, promotionsOnly: true);
    }

    private function render(Request $request, bool $promotionsOnly)
    {
        $query = trim((string) $request->query('query', ''));

        return view('home', [
            'promotionsOnly' => $promotionsOnly,
            'query' => $query,
            'searchResults' => $query !== '' ? $this->catalog->search($query) : collect(),
            'promotions' => $this->catalog->promotions()->take(6),
            'cart' => session('cart', []),
            'comparison' => session('comparison'),
        ]);
    }
}
