@php
    $money = fn ($v) => currencyAlignment(number_format((float) $v, 2));
    $qty = fn ($v) => rtrim(rtrim(number_format((float) $v, 2), '0'), '.');
    $supplier = $purchaseReturn->supplier;
    $date = \Carbon\Carbon::parse($purchaseReturn->date ?? $purchaseReturn->created_at);
    $status = [
        \App\Models\PurchaseReturn::COMPLETED => 'Completed',
        \App\Models\PurchaseReturn::PENDING => 'Pending',
    ][$purchaseReturn->status] ?? null;
    $paymentStatus = [
        \App\Models\PurchaseReturn::PAID => 'Paid',
        \App\Models\PurchaseReturn::UNPAID => 'Unpaid',
    ][$purchaseReturn->payment_status] ?? null;
    $paymentType = [1 => 'Cash', 2 => 'Cheque', 3 => 'Bank transfer', 4 => 'Other'][$purchaseReturn->payment_type] ?? null;

    $doc = [
        'title' => 'DEBIT NOTE',
        'subtitle' => 'Purchase return',
        'stamp' => $status ? strtoupper($status) : null,
        'meta' => [
            'Debit Note No' => $purchaseReturn->reference_code,
            'Date' => $date->format('d M Y'),
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
            'title' => 'Return Details',
            'rows' => [
                'Returned from' => optional($purchaseReturn->warehouse)->name,
                'Payment status' => $paymentStatus,
                'Settlement method' => $paymentType,
            ],
        ],
        'items' => $purchaseReturn->purchaseReturnItems->map(fn ($item) => [
            'name' => optional($item->product)->name,
            'code' => optional($item->product)->code,
            'qty' => $qty($item->quantity),
            'unit' => $money($item->product_cost ?: $item->net_unit_cost),
            'discount' => $money($item->discount_amount),
            'tax' => $money($item->tax_amount),
            'total' => $money($item->sub_total),
        ])->values()->all(),
        'itemsTotalQty' => $qty($purchaseReturn->purchaseReturnItems->sum('quantity')),
        'totals' => [
            'Subtotal' => $money($purchaseReturn->purchaseReturnItems->sum('sub_total')),
            'Discount' => '- '.$money($purchaseReturn->discount),
            'Tax ('.$qty($purchaseReturn->tax_rate).'%)' => $money($purchaseReturn->tax_amount),
            'Shipping' => $money($purchaseReturn->shipping),
        ],
        'grand' => ['TOTAL DEBIT', $money($purchaseReturn->grand_total)],
        'after' => [
            'Amount received' => $money($purchaseReturn->received_amount),
        ],
        'words' => amountInWords($purchaseReturn->grand_total),
        'notes' => $purchaseReturn->notes,
        'signatures' => ['Prepared by', 'Approved by', 'Supplier acknowledgement'],
    ];
@endphp
@include('pdf.partials.trade-document', ['doc' => $doc])
