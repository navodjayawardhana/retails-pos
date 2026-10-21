<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html;charset=UTF-8">
    <title>Payslip</title>
    <style>
        * { font-family: DejaVu Sans, Arial, Helvetica, sans-serif; }
        body { font-size: 11px; color: #212529; margin: 0; }
        .page { page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        table { width: 100%; border-collapse: collapse; }
        .header td { vertical-align: top; }
        .company-name { font-size: 16px; font-weight: bold; color: #1E3A8A; }
        .muted { color: #6C757D; }
        .title { font-size: 14px; font-weight: bold; text-align: right; color: #0E1B3E; }
        .bar { height: 3px; background: #1E3A8A; margin: 8px 0 12px; }
        .info td { padding: 3px 4px; }
        .info .label { color: #6C757D; width: 18%; }
        .info .value { font-weight: bold; width: 32%; }
        .section { margin-top: 12px; }
        .lines th { background: #E9EBF3; color: #0E1B3E; text-align: left; padding: 6px; font-size: 10px; text-transform: uppercase; }
        .lines td { padding: 5px 6px; border-bottom: 1px solid #DEE2E6; }
        .lines .amount { text-align: right; white-space: nowrap; }
        .lines .basis { color: #6C757D; font-size: 9px; }
        .lines .total td { font-weight: bold; border-top: 1px solid #ADB5BD; border-bottom: 0; }
        .net { margin-top: 12px; background: #0E1B3E; color: #fff; padding: 10px 12px; font-size: 14px; font-weight: bold; }
        .net span { float: right; }
        .days td { padding: 4px; border: 1px solid #DEE2E6; text-align: center; }
        .days .k { color: #6C757D; font-size: 9px; display: block; }
        .footer { margin-top: 18px; font-size: 9px; color: #6C757D; }
    </style>
</head>
<body>
@foreach($payslips as $slip)
    @php
        $earnings = $slip->items->where('type', 'earning')->sortBy('sort');
        $deductions = $slip->items->where('type', 'deduction')->sortBy('sort');
        $employer = $slip->items->where('type', 'employer')->sortBy('sort');
        $fmt = fn ($v) => number_format((float) $v, 2);
    @endphp
    <div class="page">
        <table class="header">
            <tr>
                <td style="width: 60%">
                    @if($company['logo'])
                        <img src="{{ $company['logo'] }}" style="max-height: 48px; max-width: 160px; margin-bottom: 4px;"><br>
                    @endif
                    <span class="company-name">{{ $company['name'] }}</span><br>
                    <span class="muted">{{ $company['address'] }}</span><br>
                    <span class="muted">{{ $company['phone'] }} {{ $company['email'] ? '· '.$company['email'] : '' }}</span>
                </td>
                <td class="title">
                    PAYSLIP<br>
                    <span class="muted" style="font-size: 11px; font-weight: normal;">{{ $slip->month->format('F Y') }}</span><br>
                    @if(optional($slip->payrollRun)->status === 'draft')
                        <span style="color: #F62947; font-size: 10px;">DRAFT</span>
                    @endif
                </td>
            </tr>
        </table>
        <div class="bar"></div>

        <table class="info">
            <tr>
                <td class="label">Employee</td><td class="value">{{ $slip->employee_name }}</td>
                <td class="label">Code</td><td class="value">{{ $slip->employee_code }}</td>
            </tr>
            <tr>
                <td class="label">Designation</td><td class="value">{{ $slip->designation_name ?: '-' }}</td>
                <td class="label">Department</td><td class="value">{{ $slip->department_name ?: '-' }}</td>
            </tr>
            <tr>
                <td class="label">Branch</td><td class="value">{{ $slip->branch_name ?: '-' }}</td>
                <td class="label">Pay type</td><td class="value">{{ $slip->salary_type === 'daily' ? 'Daily wage' : 'Monthly' }}</td>
            </tr>
            <tr>
                <td class="label">NIC</td><td class="value">{{ $slip->nic ?: '-' }}</td>
                <td class="label">EPF no</td><td class="value">{{ $slip->epf_no ?: '-' }}</td>
            </tr>
            <tr>
                <td class="label">Bank</td>
                <td class="value" colspan="3">{{ trim(($slip->bank_name ?: '').' '.($slip->bank_branch ? '('.$slip->bank_branch.')' : '').' '.($slip->bank_account_no ?: '')) ?: '-' }}</td>
            </tr>
        </table>

        <table class="days section">
            <tr>
                <td><span class="k">Working days</span>{{ rtrim(rtrim(number_format($slip->working_days, 1), '0'), '.') }}</td>
                <td><span class="k">Payable days</span>{{ rtrim(rtrim(number_format($slip->payable_days, 1), '0'), '.') }}</td>
                <td><span class="k">Absent</span>{{ rtrim(rtrim(number_format($slip->absent_days, 1), '0'), '.') }}</td>
                <td><span class="k">Paid leave</span>{{ rtrim(rtrim(number_format($slip->paid_leave_days, 1), '0'), '.') }}</td>
                <td><span class="k">No-pay leave</span>{{ rtrim(rtrim(number_format($slip->unpaid_leave_days, 1), '0'), '.') }}</td>
                <td><span class="k">OT hours</span>{{ rtrim(rtrim(number_format($slip->ot_hours, 2), '0'), '.') }}</td>
                <td><span class="k">Late (min)</span>{{ $slip->late_minutes }}</td>
            </tr>
        </table>

        <table class="section">
            <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 6px;">
                    <table class="lines">
                        <tr><th>Earnings</th><th class="amount">{{ $currency }}</th></tr>
                        @foreach($earnings as $item)
                            <tr>
                                <td>{{ $item->label }}@if($item->basis)<br><span class="basis">{{ $item->basis }}</span>@endif</td>
                                <td class="amount">{{ $fmt($item->amount) }}</td>
                            </tr>
                        @endforeach
                        <tr class="total"><td>Gross earnings</td><td class="amount">{{ $fmt($slip->gross_earnings) }}</td></tr>
                    </table>
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 6px;">
                    <table class="lines">
                        <tr><th>Deductions</th><th class="amount">{{ $currency }}</th></tr>
                        @forelse($deductions as $item)
                            <tr>
                                <td>{{ $item->label }}@if($item->basis)<br><span class="basis">{{ $item->basis }}</span>@endif</td>
                                <td class="amount">{{ $fmt($item->amount) }}</td>
                            </tr>
                        @empty
                            <tr><td class="muted">None</td><td></td></tr>
                        @endforelse
                        <tr class="total"><td>Total deductions</td><td class="amount">{{ $fmt($slip->total_deductions) }}</td></tr>
                    </table>
                </td>
            </tr>
        </table>

        <div class="net">NET PAY <span>{{ $currency }} {{ $fmt($slip->net_pay) }}</span></div>

        @if($employer->count())
            <table class="lines section">
                <tr><th>Employer contributions (not deducted)</th><th class="amount">{{ $currency }}</th></tr>
                @foreach($employer as $item)
                    <tr>
                        <td>{{ $item->label }}<br><span class="basis">{{ $item->basis }}</span></td>
                        <td class="amount">{{ $fmt($item->amount) }}</td>
                    </tr>
                @endforeach
            </table>
        @endif

        <div class="footer">This is a computer generated payslip. Generated {{ now()->format('Y-m-d H:i') }}.</div>
    </div>
@endforeach
</body>
</html>
