@php
    $money = fn ($v) => currencyAlignment(number_format((float) $v, 2));
    $payLabel = fn ($s) => [\App\Models\Sale::PAID => 'Paid', \App\Models\Sale::UNPAID => 'Unpaid', \App\Models\Sale::PARTIAL_PAID => 'Partial'][$s] ?? 'Unpaid';
    $sales = $customer->sales->sortBy('date')->values();
    $first = $sales->first();
    $last = $sales->last();

    $st = [
        'title' => 'CUSTOMER STATEMENT',
        'subtitle' => 'Account summary',
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
            'Invoices' => $salesData['totalSale'],
            'Total invoiced' => $money($salesData['totalAmount']),
            'Total paid' => $money($salesData['totalPaid']),
            'Balance due' => $money($salesData['totalSalesDue']),
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
            $paid = $sale->payments->sum('amount');

            return [
                $sale->date->format('d M Y'),
                $sale->reference_code,
                $payLabel($sale->payment_status),
                $money($sale->grand_total),
                $money($paid),
                $money(max(0, $sale->grand_total - $paid)),
            ];
        })->all(),
        'foot' => ['', 'Total', '', $money($salesData['totalAmount']), $money($salesData['totalPaid']), $money($salesData['totalSalesDue'])],
        'empty' => 'No invoices for this customer.',
        'note' => 'Please contact us if any entry on this statement does not match your records.',
    ];
@endphp
@include('pdf.partials.statement', ['st' => $st])
