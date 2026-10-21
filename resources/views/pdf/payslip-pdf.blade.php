<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html;charset=UTF-8">
    <title>Payslip</title>
    @include('pdf.partials.styles')
    <style>
        .lines td { padding: 5px 6px; border-bottom: 0.4px solid #b5b5b5; font-size: 9px; }
        .lines th {
            background: #e6e6e6;
            border-top: 1.2px solid #000;
            border-bottom: 1.2px solid #000;
            padding: 6px;
            font-size: 8px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            text-align: left;
        }
        .lines .num { text-align: right; white-space: nowrap; }
        .lines .basis { color: #555; font-size: 7.5px; }
        .lines .total td { font-weight: bold; border-top: 1.2px solid #000; border-bottom: 1.2px solid #000; }

        .attendance { margin-top: 12px; }
        .attendance td {
            border: 0.6px solid #8a8a8a;
            text-align: center;
            padding: 5px 2px;
            font-size: 10px;
            font-weight: bold;
            width: 14.28%;
        }
        .attendance .k { display: block; font-size: 7px; font-weight: normal; color: #555; text-transform: uppercase; letter-spacing: 0.5px; }

        .net {
            margin-top: 12px;
            border: 1.5px solid #000;
            background: #ededed;
        }
        .net td { padding: 8px 10px; vertical-align: middle; }
        .net .label { font-size: 11px; font-weight: bold; letter-spacing: 2px; }
        .net .amount { font-size: 15px; font-weight: bold; text-align: right; white-space: nowrap; }
        .net .words { font-size: 8.5px; border-top: 0.6px solid #8a8a8a; }
    </style>
</head>
<body>
@include('pdf.partials.footer', ['footerNote' => ($company['name'] ?? '').' — Confidential'])

@foreach($payslips as $slip)
    @php
        $earnings = $slip->items->where('type', 'earning')->sortBy('sort')->values();
        $deductions = $slip->items->where('type', 'deduction')->sortBy('sort')->values();
        $employer = $slip->items->where('type', 'employer')->sortBy('sort')->values();
        $fmt = fn ($v) => number_format((float) $v, 2);
        $num = fn ($v, $d = 1) => rtrim(rtrim(number_format((float) $v, $d), '0'), '.') ?: '0';
        $account = $slip->bank_account_no ? str_repeat('•', max(0, strlen($slip->bank_account_no) - 4)).substr($slip->bank_account_no, -4) : null;
        $run = $slip->payrollRun;
        $statusLabel = $run ? ucfirst($run->status) : null;
        $rows = max($earnings->count(), $deductions->count());
    @endphp
    <div class="{{ $loop->last ? '' : 'page-break' }}">
        @include('pdf.partials.header', [
            'logo' => $company['logo'] ?? null,
            'company' => $company,
            'title' => 'PAYSLIP',
            'subtitle' => 'Pay period: '.$slip->month->format('F Y'),
            'stamp' => optional($run)->status === 'draft' ? 'DRAFT' : null,
            'meta' => [
                'Payslip No' => 'PS-'.$slip->month->format('Ym').'-'.str_pad($slip->id, 4, '0', STR_PAD_LEFT),
                'Pay Period' => $slip->month->format('01 M Y').' – '.$slip->month->copy()->endOfMonth()->format('d M Y'),
                'Pay Date' => optional(optional($run)->paid_at)->format('d M Y') ?: '—',
                'Status' => $statusLabel,
            ],
        ])

        <table class="parties">
            <tr>
                <td>
                    <div class="box">
                        <div class="box-title">Employee</div>
                        <div class="box-body">
                            <div class="name">{{ $slip->employee_name }}</div>
                            <table class="kv">
                                <tr><td class="k">Employee code</td><td class="v">{{ $slip->employee_code }}</td></tr>
                                <tr><td class="k">Designation</td><td class="v">{{ $slip->designation_name ?: '—' }}</td></tr>
                                <tr><td class="k">Department</td><td class="v">{{ $slip->department_name ?: '—' }}</td></tr>
                                <tr><td class="k">Branch</td><td class="v">{{ $slip->branch_name ?: '—' }}</td></tr>
                            </table>
                        </div>
                    </div>
                </td>
                <td class="gap"></td>
                <td>
                    <div class="box">
                        <div class="box-title">Statutory &amp; Payment</div>
                        <div class="box-body">
                            <table class="kv">
                                <tr><td class="k">NIC</td><td class="v">{{ $slip->nic ?: '—' }}</td></tr>
                                <tr><td class="k">EPF no</td><td class="v">{{ $slip->epf_no ?: '—' }}</td></tr>
                                <tr><td class="k">Pay type</td><td class="v">{{ $slip->salary_type === 'daily' ? 'Daily wage' : 'Monthly salary' }}</td></tr>
                                <tr><td class="k">Bank</td><td class="v">{{ $slip->bank_name ?: '—' }}{{ $slip->bank_branch ? ' ('.$slip->bank_branch.')' : '' }}</td></tr>
                                <tr><td class="k">Account</td><td class="v">{{ $account ?: '—' }}</td></tr>
                            </table>
                        </div>
                    </div>
                </td>
            </tr>
        </table>

        <table class="attendance">
            <tr>
                <td><span class="k">Working days</span>{{ $num($slip->working_days) }}</td>
                <td><span class="k">Days paid</span>{{ $num($slip->payable_days) }}</td>
                <td><span class="k">Absent</span>{{ $num($slip->absent_days) }}</td>
                <td><span class="k">Paid leave</span>{{ $num($slip->paid_leave_days) }}</td>
                <td><span class="k">No-pay leave</span>{{ $num($slip->unpaid_leave_days) }}</td>
                <td><span class="k">OT hours</span>{{ $num($slip->ot_hours, 2) }}</td>
                <td><span class="k">Late (min)</span>{{ (int) $slip->late_minutes }}</td>
            </tr>
        </table>

        <table class="lines" style="margin-top: 12px;">
            <thead>
            <tr>
                <th style="width: 34%;">Earnings</th>
                <th class="num" style="width: 15%;">Amount</th>
                <th style="width: 2%; background: #fff; border-color: #fff;"></th>
                <th style="width: 34%;">Deductions</th>
                <th class="num" style="width: 15%;">Amount</th>
            </tr>
            </thead>
            <tbody>
            @for($i = 0; $i < max(1, $rows); $i++)
                @php $e = $earnings->get($i); $d = $deductions->get($i); @endphp
                <tr>
                    <td>@if($e){{ $e->label }}@if($e->basis)<div class="basis">{{ $e->basis }}</div>@endif @endif</td>
                    <td class="num">{{ $e ? $fmt($e->amount) : '' }}</td>
                    <td style="border-bottom: 0;"></td>
                    <td>@if($d){{ $d->label }}@if($d->basis)<div class="basis">{{ $d->basis }}</div>@endif @elseif($i === 0)<span class="muted">No deductions</span>@endif</td>
                    <td class="num">{{ $d ? $fmt($d->amount) : '' }}</td>
                </tr>
            @endfor
            <tr class="total">
                <td>Gross earnings</td>
                <td class="num">{{ $fmt($slip->gross_earnings) }}</td>
                <td style="border: 0;"></td>
                <td>Total deductions</td>
                <td class="num">{{ $fmt($slip->total_deductions) }}</td>
            </tr>
            </tbody>
        </table>

        <table class="net">
            <tr>
                <td class="label">NET PAY</td>
                <td class="amount">{{ $currency }} {{ $fmt($slip->net_pay) }}</td>
            </tr>
            <tr>
                <td class="words" colspan="2">{{ amountInWords($slip->net_pay) }}</td>
            </tr>
        </table>

        @if($employer->count())
            <table class="lines" style="margin-top: 12px; width: 60%;">
                <thead>
                <tr><th>Employer contributions (information only, not deducted)</th><th class="num">Amount</th></tr>
                </thead>
                <tbody>
                @foreach($employer as $item)
                    <tr>
                        <td>{{ $item->label }}@if($item->basis)<div class="basis">{{ $item->basis }}</div>@endif</td>
                        <td class="num">{{ $fmt($item->amount) }}</td>
                    </tr>
                @endforeach
                </tbody>
            </table>
        @endif

        <div class="notes" style="margin-top: 18px;">
            This is a computer-generated payslip and does not require a signature. Please report any discrepancy to HR within 7 days.
        </div>
    </div>
@endforeach
</body>
</html>
