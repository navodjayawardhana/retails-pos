{{--
    Monthly attendance sheet: employee × day status codes + totals (A4 landscape).
    $sheet from AttendanceService::monthlySheet(), $meta for the header box.
--}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html;charset=UTF-8">
    <title>Monthly Attendance</title>
    @include('pdf.partials.styles')
    <style>
        @page { size: A4 landscape; }
        .grid { margin-top: 12px; }
        .grid th, .grid td {
            border: 0.4px solid #9a9a9a;
            padding: 3px 1px;
            font-size: 6.5px;
            text-align: center;
            vertical-align: middle;
        }
        .grid thead th { background: #e6e6e6; font-weight: bold; }
        .grid thead th.day, .grid td.d { width: 16px; font-size: 6px; }
        .grid .tot { width: 18px; }
        .grid .weekend { background: #efefef; }
        .grid tbody tr:nth-child(even) td { background: #f7f7f7; }
        .grid tbody tr:nth-child(even) td.weekend { background: #e9e9e9; }
        .grid td.emp, .grid th.emp { text-align: left; padding-left: 3px; font-size: 7px; white-space: nowrap; }
        .grid td.emp .code { color: #555; font-size: 6px; }
        .grid .tot { font-weight: bold; }
        .grid .code-a { font-weight: bold; }
        .legend { margin-top: 8px; font-size: 7.5px; color: #333; }
        .legend span { margin-right: 10px; }
    </style>
</head>
<body>
@include('pdf.partials.footer')

@include('pdf.partials.header', [
    'logo' => $companyLogo ?? null,
    'title' => 'MONTHLY ATTENDANCE',
    'subtitle' => \Carbon\Carbon::create($sheet['year'], $sheet['month'], 1)->format('F Y'),
    'meta' => $meta,
])

@php
    $totals = [
        'present' => 'P', 'late' => 'L', 'half_day' => 'HD', 'absent' => 'A', 'leave' => 'LV', 'holiday' => 'H',
    ];
@endphp

<table class="grid">
    <thead>
    <tr>
        <th class="emp" rowspan="2">Employee</th>
        @foreach($sheet['days'] as $day)
            <th class="day {{ $day['weekday'] === 'Sun' ? 'weekend' : '' }}">{{ $day['day'] }}</th>
        @endforeach
        @foreach($totals as $label)
            <th class="tot" rowspan="2">{{ $label }}</th>
        @endforeach
        <th class="tot" rowspan="2">OT h</th>
    </tr>
    <tr>
        @foreach($sheet['days'] as $day)
            <th class="day {{ $day['weekday'] === 'Sun' ? 'weekend' : '' }}">{{ substr($day['weekday'], 0, 2) }}</th>
        @endforeach
    </tr>
    </thead>
    <tbody>
    @forelse($sheet['rows'] as $row)
        <tr>
            <td class="emp">
                {{ $row['employee_name'] }}<br><span class="code">{{ $row['employee_code'] }}</span>
            </td>
            @foreach($sheet['days'] as $day)
                @php $code = $row['days'][$day['day']] ?? ''; @endphp
                <td class="d {{ $code === 'W' ? 'weekend' : '' }} {{ $code === 'A' ? 'code-a' : '' }}">{{ $code }}</td>
            @endforeach
            @foreach(array_keys($totals) as $key)
                <td class="tot">{{ $row['totals'][$key] ?? 0 }}</td>
            @endforeach
            <td class="tot">{{ round(($row['totals']['ot_minutes'] ?? 0) / 60, 1) }}</td>
        </tr>
    @empty
        <tr><td colspan="{{ count($sheet['days']) + 8 }}" class="empty">No active employees for this filter</td></tr>
    @endforelse
    </tbody>
</table>

<div class="legend">
    <b>Codes:</b>
    <span>P present</span><span>L late</span><span>HD half day</span><span>A absent</span>
    <span>LV leave</span><span>H holiday</span><span>W weekend</span><span>- not marked</span>
</div>
</body>
</html>
