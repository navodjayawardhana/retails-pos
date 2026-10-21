@php
    $money = fn ($v) => currencyAlignment(number_format((float) $v, 2));
    $qty = fn ($v) => rtrim(rtrim(number_format((float) $v, 2), '0'), '.');
    $customer = $quotation->customer;
    $date = \Carbon\Carbon::parse($quotation->date ?? $quotation->created_at);
    $validDays = (int) (\App\Models\Setting::where('key', 'quotation_valid_days')->value('value') ?: 30);
    $status = [
        \App\Models\Quotation::SENT => 'Sent',
        \App\Models\Quotation::PENDING => 'Pending',
    ][$quotation->status] ?? null;

    $doc = [
        'title' => 'QUOTATION',
        'stamp' => $status ? strtoupper($status) : null,
        'meta' => [
            'Quotation No' => $quotation->reference_code,
            'Date' => $date->format('d M Y'),
            'Valid Until' => $date->copy()->addDays($validDays)->format('d M Y'),
            'Status' => $status,
        ],
        'left' => [
            'title' => 'Prepared For',
            'name' => optional($customer)->name,
            'lines' => [
                optional($customer)->phone ? 'Tel: '.$customer->phone : null,
                trim(implode(', ', array_filter([optional($customer)->address, optional($customer)->city, optional($customer)->country]))),
                optional($customer)->email,
            ],
        ],
        'right' => [
            'title' => 'Quotation Details',
            'rows' => [
                'Branch' => optional($quotation->warehouse)->name,
                'Validity' => $validDays.' days',
                'Currency' => getCurrencyCode(),
            ],
        ],
        'items' => $quotation->quotationItems->map(fn ($item) => [
            'name' => optional($item->product)->name,
            'code' => optional($item->product)->code,
            'qty' => $qty($item->quantity),
            'unit' => $money($item->product_price ?: $item->net_unit_price),
            'discount' => $money($item->discount_amount),
            'tax' => $money($item->tax_amount),
            'total' => $money($item->sub_total),
        ])->values()->all(),
        'itemsTotalQty' => $qty($quotation->quotationItems->sum('quantity')),
        'totals' => [
            'Subtotal' => $money($quotation->quotationItems->sum('sub_total')),
            'Order discount' => '- '.$money($quotation->discount),
            'Order tax ('.$qty($quotation->tax_rate).'%)' => $money($quotation->tax_amount),
            'Shipping' => $money($quotation->shipping),
        ],
        'grand' => ['TOTAL', $money($quotation->grand_total)],
        'words' => amountInWords($quotation->grand_total),
        'notes' => $quotation->note,
        'terms' => [
            'Prices are valid until the date shown above.',
            'Stock is subject to availability at the time of order.',
            'Payment terms and delivery will be confirmed on acceptance.',
        ],
        'disclaimer' => 'This is a quotation, not a tax invoice.',
        'signatures' => ['Prepared by', 'Customer acceptance'],
        'thanks' => 'We look forward to serving you.',
    ];
@endphp
@include('pdf.partials.trade-document', ['doc' => $doc])
