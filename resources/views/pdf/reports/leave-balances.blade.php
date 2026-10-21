{{--
    Leave balances: employee × leave type (entitled / used / pending / balance).
    $report from LeaveService::balanceReport(), $meta for the header box.
--}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html;charset=UTF-8">
    <title>Leave Balances</title>
    @include('pdf.partials.styles')
    @php
        $subCols = 0;
        foreach ($report['types'] as $type) {
            $subCols += $type['is_unlimited'] ? 1 : 4;
        }
        $landscape = $subCols > 6;
    @endphp
    <style>
        @if($landscape) @page { size: A4 landscape; } @endif
        .bal { margin-top: 12px; }
        .bal th, .bal td {
            border: 0.4px solid #9a9a9a;
            padding: 4px 3px;
            font-size: 7.5px;
            text-align: center;
            vertical-align: middle;
        }
        .bal thead th { background: #e6e6e6; font-weight: bold; }
        .bal thead tr.types th { border-bottom: 0.8px solid #000; letter-spacing: 0.5px; text-transform: uppercase; }
        .bal tbody tr:nth-child(even) td { background: #f5f5f5; }
        .bal td.emp { text-align: left; }
        .bal td.emp .sub { color: #555; font-size: 6.5px; }
        .bal td.balance { font-weight: bold; }
        .bal td.idx { color: #555; width: 14px; }
    </style>
</head>
<body>
@include('pdf.partials.footer')

@include('pdf.partials.header', [
    'logo' => $companyLogo ?? null,
    'title' => 'LEAVE BALANCES',
    'subtitle' => 'Leave year '.$report['year'],
    'meta' => $meta,
])

<table class="bal">
    <thead>
    <tr class="types">
        <th rowspan="2" class="idx">#</th>
        <th rowspan="2" style="text-align: left;">Employee</th>
        @foreach($report['types'] as $type)
            <th colspan="{{ $type['is_unlimited'] ? 1 : 4 }}">{{ $type['name'] }}</th>
        @endforeach
    </tr>
    <tr>
        @foreach($report['types'] as $type)
            @if($type['is_unlimited'])
                <th>Used</th>
            @else
                <th>Entitled</th><th>Used</th><th>Pending</th><th>Balance</th>
            @endif
        @endforeach
    </tr>
    </thead>
    <tbody>
    @forelse($report['rows'] as $i => $row)
        <tr>
            <td class="idx">{{ $i + 1 }}</td>
            <td class="emp">
                {{ $row['employee_name'] }}<br>
                <span class="sub">{{ $row['employee_code'] }}{{ $row['department_name'] ? ' · '.$row['department_name'] : '' }}</span>
            </td>
            @foreach($report['types'] as $type)
                @php $cell = $row['cells'][$type['id']] ?? null; @endphp
                @if($type['is_unlimited'])
                    <td>{{ $cell ? $cell['used'] : '' }}</td>
                @else
                    <td>{{ $cell ? $cell['entitled'] : '' }}</td>
                    <td>{{ $cell ? $cell['used'] : '' }}</td>
                    <td>{{ $cell ? $cell['pending'] : '' }}</td>
                    <td class="balance">{{ $cell ? $cell['balance'] : '' }}</td>
                @endif
            @endforeach
        </tr>
    @empty
        <tr><td colspan="{{ $subCols + 2 }}" class="empty">No active employees for this filter</td></tr>
    @endforelse
    </tbody>
</table>
</body>
</html>
