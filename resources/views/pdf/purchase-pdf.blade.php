@php
    $money = fn ($v) => currencyAlignment(number_format((float) $v, 2));
    $qty = fn ($v) => rtrim(rtrim(number_format((float) $v, 2), '0'), '.');
    $supplier = $purchase->supplier;
    $date = \Carbon\Carbon::parse($purchase->date ?? $purchase->created_at);
    $status = [
        \App\Models\Purchase::RECEIVED => 'Received',
        \App\Models\Purchase::PENDING => 'Pending',
        \App\Models\Purchase::ORDERED => 'Ordered',
    ][$purchase->status] ?? null;
    $paymentType = [1 => 'Cash', 2 => 'Cheque', 3 => 'Bank transfer', 4 => 'Other'][$purchase->payment_type] ?? null;
    $paid = (float) $purchase->received_amount;
    $warehouse = $purchase->warehouse;

    $doc = [
        'title' => 'PURCHASE ORDER',
        'stamp' => $status ? strtoupper($status) : null,
        'meta' => [
            'PO No' => $purchase->reference_code,
            'PO Date' => $date->format('d M Y'),
            'Status' => $status,
        ],
        'left' => [
            'title' => 'Supplier',
            'name' => optional($supplier)->name,
            'lines' => [
                optional($supplier)->phone ? 'Tel: '.$supplier->phone : null,
                trim(implode(', ', array_filter([optional($supplier)->address, optional($supplier)->city, optional($supplier)->country]))),
                optional($supplier)->email,
            ],
        ],
        'right' => [
            'title' => 'Deliver To',
            'rows' => [
                'Warehouse' => optional($warehouse)->name,
                'Address' => trim(implode(', ', array_filter([optional($warehouse)->city, optional($warehouse)->country]))),
                'Phone' => optional($warehouse)->phone,
                'Payment method' => $paymentType,
            ],
        ],
        'items' => $purchase->purchaseItems->map(fn ($item) => [
            'name' => optional($item->product)->name,
            'code' => optional($item->product)->code,
            'qty' => $qty($item->quantity),
            'unit' => $money($item->product_cost ?: $item->net_unit_cost),
            'discount' => $money($item->discount_amount),
            'tax' => $money($item->tax_amount),
            'total' => $money($item->sub_total),
        ])->values()->all(),
        'itemsTotalQty' => $qty($purchase->purchaseItems->sum('quantity')),
        'totals' => [
            'Subtotal' => $money($purchase->purchaseItems->sum('sub_total')),
            'Order discount' => '- '.$money($purchase->discount),
            'Order tax ('.$qty($purchase->tax_rate).'%)' => $money($purchase->tax_amount),
            'Shipping' => $money($purchase->shipping),
        ],
        'grand' => ['TOTAL', $money($purchase->grand_total)],
        'after' => [
            'Amount paid' => $money($paid),
            'Balance payable' => $money(max(0, (float) $purchase->grand_total - $paid)),
        ],
        'words' => amountInWords($purchase->grand_total),
        'notes' => $purchase->notes,
        'signatures' => ['Prepared by', 'Approved by', 'Received by'],
    ];
@endphp
@include('pdf.partials.trade-document', ['doc' => $doc])
