{{--
    Shared layout for customer statements and tabular reports.

    $st = [
        'title', 'subtitle'?, 'meta' => [label => value],
        'party'   => ['title', 'name', 'lines' => [..]] | null,
        'summary' => [label => value] | [],          // key figures box
        'columns' => [['label', 'num' => bool], ...],
        'rows'    => [[cell, cell, ...], ...],
        'foot'    => [cell, ...] | null,              // totals row
        'empty'   => 'No records',
        'note'?,
    ]
--}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html;charset=UTF-8">
    <title>{{ $st['title'] }}</title>
    @include('pdf.partials.styles')
    @if(!empty($st['landscape']))
        <style>@page { size: A4 landscape; }</style>
    @endif
    @if(!empty($st['compact']))
        <style>
            .items thead th { font-size: 7px; padding: 4px 3px; letter-spacing: 0; }
            .items tbody td, .items tfoot td { font-size: 7.5px; padding: 4px 3px; }
        </style>
    @endif
</head>
<body>
@include('pdf.partials.footer')

@include('pdf.partials.header', [
    'logo' => $companyLogo ?? null,
    'title' => $st['title'],
    'subtitle' => $st['subtitle'] ?? null,
    'meta' => $st['meta'],
])

@if(!empty($st['party']) || !empty($st['summary']))
    <table class="parties">
        <tr>
            <td>
                @if(!empty($st['party']))
                    <div class="box">
                        <div class="box-title">{{ $st['party']['title'] }}</div>
                        <div class="box-body">
                            <div class="name">{{ $st['party']['name'] ?: '—' }}</div>
                            @foreach(array_filter($st['party']['lines'] ?? []) as $line)
                                <div>{{ $line }}</div>
                            @endforeach
                        </div>
                    </div>
                @endif
            </td>
            <td class="gap"></td>
            <td>
                @if(!empty($st['summary']))
                    <div class="box">
                        <div class="box-title">Summary</div>
                        <div class="box-body">
                            <table class="kv">
                                @foreach($st['summary'] as $label => $value)
                                    <tr>
                                        <td class="k">{{ $label }}</td>
                                        <td class="v right">{{ $value }}</td>
                                    </tr>
                                @endforeach
                            </table>
                        </div>
                    </div>
                @endif
            </td>
        </tr>
    </table>
@endif

<table class="items">
    <thead>
    <tr>
        <th class="idx">#</th>
        @foreach($st['columns'] as $col)
            <th class="{{ !empty($col['num']) ? 'num' : '' }}">{{ $col['label'] }}</th>
        @endforeach
    </tr>
    </thead>
    <tbody>
    @forelse($st['rows'] as $i => $row)
        <tr>
            <td class="idx">{{ $i + 1 }}</td>
            @foreach($row as $c => $cell)
                <td class="{{ !empty($st['columns'][$c]['num']) ? 'num' : '' }}">{{ $cell }}</td>
            @endforeach
        </tr>
    @empty
        <tr><td colspan="{{ count($st['columns']) + 1 }}" class="empty">{{ $st['empty'] ?? 'No records' }}</td></tr>
    @endforelse
    </tbody>
    @if(!empty($st['foot']) && count($st['rows']))
        <tfoot>
        <tr>
            <td></td>
            @foreach($st['foot'] as $c => $cell)
                <td class="{{ !empty($st['columns'][$c]['num']) ? 'num' : '' }}">{{ $cell }}</td>
            @endforeach
        </tr>
        </tfoot>
    @endif
</table>

@if(!empty($st['note']))
    <div class="notes" style="margin-top: 14px;">{{ $st['note'] }}</div>
@endif
</body>
</html>
