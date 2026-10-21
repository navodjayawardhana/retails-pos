@php
    $money = fn ($v) => currencyAlignment(number_format((float) $v, 2));
    $statusLabel = fn ($s) => [\App\Models\Quotation::SENT => 'Sent', \App\Models\Quotation::PENDING => 'Pending'][$s] ?? '—';
    $quotations = $customer->quotations->sortBy('date')->values();
    $total = $quotations->sum('grand_total');
    $first = $quotations->first();
    $last = $quotations->last();

    $st = [
        'title' => 'CUSTOMER STATEMENT',
        'subtitle' => 'Quotations',
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
            'Quotations' => $quotations->count(),
            'Total quoted' => $money($total),
        ],
        'columns' => [
            ['label' => 'Date'],
            ['label' => 'Quotation'],
            ['label' => 'Status'],
            ['label' => 'Amount', 'num' => true],
        ],
        'rows' => $quotations->map(fn ($q) => [
            $q->date->format('d M Y'),
            $q->reference_code,
            $statusLabel($q->status),
            $money($q->grand_total),
        ])->all(),
        'foot' => ['', 'Total', '', $money($total)],
        'empty' => 'No quotations for this customer.',
    ];
@endphp
@include('pdf.partials.statement', ['st' => $st])
