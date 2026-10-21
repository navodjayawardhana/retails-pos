@php
    $money = fn ($v) => currencyAlignment(number_format((float) $v, 2));
    $ranked = $topCustomers->values();

    $st = [
        'title' => 'BEST CUSTOMERS',
        'subtitle' => 'Top customers by sales value',
        'meta' => [
            'Period' => now()->format('F Y'),
            'Report Date' => now()->format('d M Y'),
            'Customers' => $ranked->count(),
        ],
        'party' => null,
        'summary' => [],
        'columns' => [
            ['label' => 'Customer'],
            ['label' => 'Phone'],
            ['label' => 'Email'],
            ['label' => 'Sales', 'num' => true],
            ['label' => 'Total Sales', 'num' => true],
        ],
        'rows' => $ranked->map(fn ($c) => [
            $c->name,
            $c->phone ?: '—',
            $c->email ?: '—',
            $c->sales_count,
            $money($c->grand_total),
        ])->all(),
        'foot' => ['Total', '', '', $ranked->sum('sales_count'), $money($ranked->sum('grand_total'))],
        'empty' => 'No sales this month.',
        'note' => 'Ranked by total sales value for the current month.',
    ];
@endphp
@include('pdf.partials.statement', ['st' => $st])
