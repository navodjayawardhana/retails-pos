@php
    $money = fn ($v) => currencyAlignment(number_format((float) $v, 2));
    $qty = fn ($v) => rtrim(rtrim(number_format((float) $v, 2), '0'), '.');
    $customer = $saleReturn->customer;
    $date = \Carbon\Carbon::parse($saleReturn->date ?? $saleReturn->created_at);
    $originalSale = $saleReturn->sale_id ? $saleReturn->sale : null;
    $status = [
        \App\Models\SaleReturn::RECEIVED => 'Received',
        \App\Models\SaleReturn::PENDING => 'Pending',
    ][$saleReturn->status] ?? null;
    $paymentType = [1 => 'Cash', 2 => 'Cheque', 3 => 'Bank transfer', 4 => 'Other'][$saleReturn->payment_type] ?? null;

    $doc = [
        'title' => 'CREDIT NOTE',
        'subtitle' => 'Sale return',
        'stamp' => $status ? strtoupper($status) : null,
        'meta' => [
            'Credit Note No' => $saleReturn->reference_code,
            'Date' => $date->format('d M Y'),
            'Against Invoice' => optional($originalSale)->reference_code ?: '—',
            'Status' => $status,
        ],
        'left' => [
            'title' => 'Customer',
            'name' => optional($customer)->name,
            'lines' => [
                optional($customer)->phone ? 'Tel: '.$customer->phone : null,
                trim(implode(', ', array_filter([optional($customer)->address, optional($customer)->city, optional($customer)->country]))),
                optional($customer)->email,
            ],
        ],
        'right' => [
            'title' => 'Return Details',
            'rows' => [
                'Original invoice' => optional($originalSale)->reference_code,
                'Invoice date' => $originalSale ? \Carbon\Carbon::parse($originalSale->date ?? $originalSale->created_at)->format('d M Y') : null,
                'Branch' => optional($saleReturn->warehouse)->name,
                'Refund method' => $paymentType,
            ],
        ],
        'items' => $saleReturn->saleReturnItems->map(fn ($item) => [
            'name' => optional($item->product)->name,
            'code' => optional($item->product)->code,
            'qty' => $qty($item->quantity),
            'unit' => $money($item->product_price ?: $item->net_unit_price),
            'discount' => $money($item->discount_amount),
            'tax' => $money($item->tax_amount),
            'total' => $money($item->sub_total),
        ])->values()->all(),
        'itemsTotalQty' => $qty($saleReturn->saleReturnItems->sum('quantity')),
        'totals' => [
            'Subtotal' => $money($saleReturn->saleReturnItems->sum('sub_total')),
            'Discount' => '- '.$money($saleReturn->discount),
            'Tax ('.$qty($saleReturn->tax_rate).'%)' => $money($saleReturn->tax_amount),
            'Shipping' => $money($saleReturn->shipping),
        ],
        'grand' => ['TOTAL CREDIT', $money($saleReturn->grand_total)],
        'after' => [
            'Refunded' => $money($saleReturn->paid_amount),
        ],
        'words' => amountInWords($saleReturn->grand_total),
        'notes' => $saleReturn->note,
        'signatures' => ['Customer signature', 'Authorised signature'],
    ];
@endphp
@include('pdf.partials.trade-document', ['doc' => $doc])
