@php
    $money = fn ($v) => currencyAlignment(number_format((float) $v, 2));
    $qty = fn ($v) => rtrim(rtrim(number_format((float) $v, 2), '0'), '.');
    $paid = (float) $sale->payments->sum('amount');
    $balance = max(0, (float) $sale->grand_total - $paid);
    $subtotal = $sale->saleItems->sum('sub_total');
    $paymentStatus = [
        \App\Models\Sale::PAID => 'Paid',
        \App\Models\Sale::UNPAID => 'Unpaid',
        \App\Models\Sale::PARTIAL_PAID => 'Partially paid',
    ][$sale->payment_status] ?? 'Unpaid';
    $paymentType = [
        \App\Models\Sale::CASH => 'Cash',
        \App\Models\Sale::CHEQUE => 'Cheque',
        \App\Models\Sale::BANK_TRANSFER => 'Bank transfer',
        \App\Models\Sale::OTHER => 'Other',
    ][$sale->payment_type] ?? null;
    $status = [
        \App\Models\Sale::COMPLETED => 'Completed',
        \App\Models\Sale::PENDING => 'Pending',
        \App\Models\Sale::ORDERED => 'Ordered',
    ][$sale->status] ?? null;
    $customer = $sale->customer;
    $date = \Carbon\Carbon::parse($sale->date ?? $sale->created_at);

    $doc = [
        'title' => 'INVOICE',
        'stamp' => strtoupper($paymentStatus),
        'meta' => [
            'Invoice No' => $sale->reference_code,
            'Invoice Date' => $date->format('d M Y'),
            'Status' => $status,
            'Payment' => $paymentStatus,
        ],
        'left' => [
            'title' => 'Bill To',
            'name' => optional($customer)->name,
            'lines' => [
                optional($customer)->phone ? 'Tel: '.$customer->phone : null,
                trim(implode(', ', array_filter([optional($customer)->address, optional($customer)->city, optional($customer)->country]))),
                optional($customer)->email,
            ],
        ],
        'right' => [
            'title' => 'Invoice Details',
            'rows' => [
                'Branch' => optional($sale->warehouse)->name,
                'Payment method' => $paymentType,
                'Payment status' => $paymentStatus,
                'Currency' => getCurrencyCode(),
            ],
        ],
        'items' => $sale->saleItems->map(fn ($item) => [
            'name' => optional($item->product)->name,
            'code' => optional($item->product)->code,
            'qty' => $qty($item->quantity),
            'unit' => $money($item->product_price ?: $item->net_unit_price),
            'discount' => $money($item->discount_amount),
            'tax' => $money($item->tax_amount),
            'total' => $money($item->sub_total),
        ])->values()->all(),
        'itemsTotalQty' => $qty($sale->saleItems->sum('quantity')),
        'totals' => [
            'Subtotal' => $money($subtotal),
            'Order discount' => '- '.$money($sale->discount),
            'Order tax ('.$qty($sale->tax_rate).'%)' => $money($sale->tax_amount),
            'Shipping' => $money($sale->shipping),
        ],
        'grand' => ['GRAND TOTAL', $money($sale->grand_total)],
        'after' => [
            'Amount paid' => $money($paid),
            'Balance due' => $money($balance),
        ],
        'words' => amountInWords($sale->grand_total),
        'notes' => $sale->note,
        'signatures' => ['Customer signature', 'Authorised signature'],
        'thanks' => 'Thank you for your business!',
    ];
@endphp
@include('pdf.partials.trade-document', ['doc' => $doc])
