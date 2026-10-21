{{--
    Shared layout for invoice / quotation / purchase order / credit note / debit note.

    $doc = [
        'title', 'subtitle'?, 'stamp'?, 'meta' => [label => value],
        'left'  => ['title', 'name', 'lines' => [..]],          // Bill To / Supplier
        'right' => ['title', 'rows' => [label => value]],       // details box
        'items' => [['name','code','qty','unit','discount','tax','total'], ...],
        'itemsTotalQty'?, 'totals' => [label => value], 'grand' => [label, value],
        'after' => [label => value]  (Paid / Balance due),
        'words'?, 'notes'?, 'terms'? (array), 'disclaimer'?, 'signatures' => [..], 'thanks'?,
    ]
--}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html;charset=UTF-8">
    <title>{{ $doc['title'] }} {{ $doc['meta'][array_key_first($doc['meta'])] ?? '' }}</title>
    @include('pdf.partials.styles')
</head>
<body>
@include('pdf.partials.footer', ['footerNote' => $doc['footerNote'] ?? null])

@include('pdf.partials.header', [
    'logo' => $companyLogo ?? null,
    'title' => $doc['title'],
    'subtitle' => $doc['subtitle'] ?? null,
    'stamp' => $doc['stamp'] ?? null,
    'meta' => $doc['meta'],
])

<table class="parties">
    <tr>
        <td>
            <div class="box">
                <div class="box-title">{{ $doc['left']['title'] }}</div>
                <div class="box-body">
                    <div class="name">{{ $doc['left']['name'] ?: '—' }}</div>
                    @foreach(array_filter($doc['left']['lines'] ?? []) as $line)
                        <div>{{ $line }}</div>
                    @endforeach
                </div>
            </div>
        </td>
        <td class="gap"></td>
        <td>
            <div class="box">
                <div class="box-title">{{ $doc['right']['title'] }}</div>
                <div class="box-body">
                    <table class="kv">
                        @foreach($doc['right']['rows'] as $label => $value)
                            <tr>
                                <td class="k">{{ $label }}</td>
                                <td class="v">{{ $value !== null && $value !== '' ? $value : '—' }}</td>
                            </tr>
                        @endforeach
                    </table>
                </div>
            </div>
        </td>
    </tr>
</table>

<table class="items">
    <thead>
    <tr>
        <th class="idx">#</th>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Unit Price</th>
        <th class="num">Discount</th>
        <th class="num">Tax</th>
        <th class="num">Amount</th>
    </tr>
    </thead>
    <tbody>
    @forelse($doc['items'] as $i => $item)
        <tr>
            <td class="idx">{{ $i + 1 }}</td>
            <td>
                {{ $item['name'] }}
                @if(!empty($item['code']))<div class="code">{{ $item['code'] }}</div>@endif
            </td>
            <td class="num">{{ $item['qty'] }}</td>
            <td class="num">{{ $item['unit'] }}</td>
            <td class="num">{{ $item['discount'] }}</td>
            <td class="num">{{ $item['tax'] }}</td>
            <td class="num bold">{{ $item['total'] }}</td>
        </tr>
    @empty
        <tr><td colspan="7" class="empty">No items</td></tr>
    @endforelse
    </tbody>
    @if(isset($doc['itemsTotalQty']))
        <tfoot>
        <tr>
            <td></td>
            <td>Total items: {{ count($doc['items']) }}</td>
            <td class="num">{{ $doc['itemsTotalQty'] }}</td>
            <td colspan="4"></td>
        </tr>
        </tfoot>
    @endif
</table>

<table class="summary">
    <tr>
        <td style="width: 54%; padding-right: 16px;">
            @if(!empty($doc['words']))
                <div class="words">
                    <div class="label">Amount in words</div>
                    {{ $doc['words'] }}
                </div>
            @endif
            @if(!empty($doc['notes']))
                <div class="notes">
                    <div class="label">Notes</div>
                    {{ $doc['notes'] }}
                </div>
            @endif
            @if(!empty($doc['terms']))
                <div class="notes">
                    <div class="label">Terms &amp; Conditions</div>
                    @foreach($doc['terms'] as $n => $term)
                        <div>{{ $n + 1 }}. {{ $term }}</div>
                    @endforeach
                </div>
            @endif
        </td>
        <td style="width: 46%;">
            <table class="totals">
                @foreach($doc['totals'] as $label => $value)
                    <tr>
                        <td class="k">{{ $label }}</td>
                        <td class="v">{{ $value }}</td>
                    </tr>
                @endforeach
                <tr class="grand">
                    <td>{{ $doc['grand'][0] }}</td>
                    <td class="right nowrap">{{ $doc['grand'][1] }}</td>
                </tr>
                @foreach(($doc['after'] ?? []) as $label => $value)
                    <tr>
                        <td class="k {{ $loop->last ? 'bold' : '' }}">{{ $label }}</td>
                        <td class="v {{ $loop->last ? 'bold' : '' }}">{{ $value }}</td>
                    </tr>
                @endforeach
            </table>
        </td>
    </tr>
</table>

@if(!empty($doc['disclaimer']))
    <div class="notes center bold" style="margin-top: 14px;">{{ $doc['disclaimer'] }}</div>
@endif

@if(!empty($doc['signatures']))
    <table class="signatures">
        <tr>
            @foreach($doc['signatures'] as $label)
                @if(!$loop->first)<td class="gap"></td>@endif
                <td><div class="line">{{ $label }}</div></td>
            @endforeach
        </tr>
    </table>
@endif

@if(!empty($doc['thanks']))
    <div class="thanks">{{ $doc['thanks'] }}</div>
@endif
</body>
</html>
