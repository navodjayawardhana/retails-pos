@php
    $money = fn ($v) => currencyAlignment(number_format((float) $v, 2));
    $payLabel = fn ($s) => [\App\Models\Sale::PAID => 'Paid', \App\Models\Sale::UNPAID => 'Unpaid', \App\Models\Sale::PARTIAL_PAID => 'Partial'][$s] ?? 'Unpaid';
    $sales = $customer->sales->sortBy('date')->values();
    $total = $sales->sum('grand_total');
    $paid = $sales->sum(fn ($s) => $s->payments->sum('amount'));
    $first = $sales->first();
    $last = $sales->last();

    $st = [
        'title' => 'CUSTOMER STATEMENT',
        'subtitle' => 'Sales',
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
            'Invoices' => $sales->count(),
            'Total invoiced' => $money($total),
            'Total paid' => $money($paid),
            'Balance due' => $money(max(0, $total - $paid)),
        ],
        'columns' => [
            ['label' => 'Date'],
            ['label' => 'Invoice'],
            ['label' => 'Status'],
            ['label' => 'Amount', 'num' => true],
            ['label' => 'Paid', 'num' => true],
            ['label' => 'Balance', 'num' => true],
        ],
        'rows' => $sales->map(function ($sale) use ($money, $payLabel) {
            $p = $sale->payments->sum('amount');

            return [
                $sale->date->format('d M Y'),
                $sale->reference_code,
                $payLabel($sale->payment_status),
                $money($sale->grand_total),
                $money($p),
                $money(max(0, $sale->grand_total - $p)),
            ];
        })->all(),
        'foot' => ['', 'Total', '', $money($total), $money($paid), $money(max(0, $total - $paid))],
        'empty' => 'No sales for this customer.',
    ];
@endphp
@include('pdf.partials.statement', ['st' => $st])
