@php
    $money = fn ($v) => currencyAlignment(number_format((float) $v, 2));
    $statusLabel = fn ($s) => [\App\Models\SaleReturn::RECEIVED => 'Received', \App\Models\SaleReturn::PENDING => 'Pending'][$s] ?? '—';
    $returns = $customer->salesReturns->sortBy('date')->values();
    $total = $returns->sum('grand_total');
    $first = $returns->first();
    $last = $returns->last();

    $st = [
        'title' => 'CUSTOMER STATEMENT',
        'subtitle' => 'Returns (credit notes)',
        'meta' => [
            'Customer' => $customer->name,
            'Period' => $first ? $first->date->format('d M Y').' – '.$last->date->format('d M Y') : '—',
            'Statement Date' => now()->format('d M Y'),
        ],
        'party' => [
            'title' => 'Customer',
            'name' => $customer->name,
            'lines' => [
                $customer->phone ? 'Tel: '.$customer->phone : null,
                trim(implode(', ', array_filter([$customer->address, $customer->city, $customer->country]))),
                $customer->email,
            ],
        ],
        'summary' => [
            'Returns' => $returns->count(),
            'Total credited' => $money($total),
        ],
        'columns' => [
            ['label' => 'Date'],
            ['label' => 'Credit Note'],
            ['label' => 'Status'],
            ['label' => 'Amount', 'num' => true],
        ],
        'rows' => $returns->map(fn ($r) => [
            $r->date->format('d M Y'),
            $r->reference_code,
            $statusLabel($r->status),
            $money($r->grand_total),
        ])->all(),
        'foot' => ['', 'Total', '', $money($total)],
        'empty' => 'No returns for this customer.',
    ];
@endphp
@include('pdf.partials.statement', ['st' => $st])
