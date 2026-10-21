@php
    $money = fn ($v) => currencyAlignment(number_format((float) $v, 2));
    $typeLabel = fn ($t) => [1 => 'Cash', 2 => 'Cheque', 3 => 'Bank transfer', 4 => 'Other'][$t] ?? '—';
    $customer = $customer ?? optional(optional($payments->first())->sale)->customer;
    $rows = $payments->sortBy('payment_date')->values();
    $total = $rows->sum('amount');
    $date = fn ($d) => $d ? \Carbon\Carbon::parse($d)->format('d M Y') : '—';
    $first = $rows->first();
    $last = $rows->last();

    $st = [
        'title' => 'CUSTOMER STATEMENT',
        'subtitle' => 'Payments received',
        'meta' => [
            'Customer' => optional($customer)->name ?: '—',
            'Period' => $first ? $date($first->payment_date).' – '.$date($last->payment_date) : '—',
            'Statement Date' => now()->format('d M Y'),
        ],
        'party' => $customer ? [
            'title' => 'Customer',
            'name' => $customer->name,
            'lines' => [
                $customer->phone ? 'Tel: '.$customer->phone : null,
                trim(implode(', ', array_filter([$customer->address, $customer->city, $customer->country]))),
                $customer->email,
            ],
        ] : null,
        'summary' => [
            'Payments' => $rows->count(),
            'Total received' => $money($total),
        ],
        'columns' => [
            ['label' => 'Date'],
            ['label' => 'Invoice'],
            ['label' => 'Reference'],
            ['label' => 'Method'],
            ['label' => 'Amount', 'num' => true],
        ],
        'rows' => $rows->map(fn ($p) => [
            $date($p->payment_date),
            optional($p->sale)->reference_code,
            $p->reference ?: '—',
            $typeLabel($p->payment_type),
            $money($p->amount),
        ])->all(),
        'foot' => ['', 'Total', '', '', $money($total)],
        'empty' => 'No payments recorded for this customer.',
    ];
@endphp
@include('pdf.partials.statement', ['st' => $st])
