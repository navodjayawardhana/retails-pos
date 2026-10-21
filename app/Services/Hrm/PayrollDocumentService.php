<?php

namespace App\Services\Hrm;

use App\Exports\PayrollArrayExport;
use App\Models\PayrollRun;
use App\Models\Payslip;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Payslip PDFs (single or a whole run in one PDF, one payslip per page) and payroll Excel sheets.
 * Files are written to the same disk/paths as the app's other PDFs and returned as URLs.
 */
class PayrollDocumentService
{
    public function payslipPdf(Collection $payslips, string $fileName): string
    {
        $payslips = \Illuminate\Database\Eloquent\Collection::make($payslips->all())->load(['items', 'payrollRun']);
        $company = [
            'name' => getSettingValue('company_name'),
            'address' => getSettingValue('address'),
            'phone' => getSettingValue('phone'),
            'email' => getSettingValue('email'),
            'logo' => $this->logoDataUri(),
        ];
        $currency = $this->currency();

        $pdf = Pdf::loadView('pdf.payslip-pdf', compact('payslips', 'company', 'currency'))->setOptions([
            'tempDir' => public_path(),
            'chroot' => public_path(),
        ]);
        $path = 'pdf/payroll/'.$fileName;
        Storage::disk(config('app.media_disc'))->put($path, pdfWithPageNumbers($pdf)->output());

        return Storage::disk(config('app.media_disc'))->url($path);
    }

    /**
     * Run summary table shared by the Excel and PDF exports: ['header', 'rows', 'total'].
     */
    public function runSummaryTable(PayrollRun $run): array
    {
        $rows = [];
        foreach ($run->payslips()->orderBy('employee_code')->get() as $p) {
            $rows[] = [$p->employee_code, $p->employee_name, $p->branch_name, $p->department_name, $p->designation_name,
                $p->salary_type, $p->payable_days, $p->absent_days, $p->ot_hours, $p->gross_earnings, $p->total_deductions,
                $p->net_pay, $p->epf_base, $p->epf_employee, $p->epf_employer, $p->etf];
        }

        return [
            'header' => ['Code', 'Employee', 'Branch', 'Department', 'Designation', 'Type', 'Payable days', 'Absent days', 'OT hours',
                'Gross earnings', 'Total deductions', 'Net pay', 'EPF base', 'EPF employee', 'EPF employer', 'ETF'],
            'rows' => $rows,
            'total' => ['', 'TOTAL', '', '', '', '', '', '', '', $run->gross_total, $run->deduction_total, $run->net_total, '',
                $run->epf_employee_total, $run->epf_employer_total, $run->etf_total],
        ];
    }

    public function runSummaryExcel(PayrollRun $run): string
    {
        $table = $this->runSummaryTable($run);

        return $this->excel(array_merge([$table['header']], $table['rows'], [$table['total']]),
            'Payroll '.$run->month->format('M Y'), 'payroll-summary-'.$run->id.'.xlsx');
    }

    /**
     * Bank transfer table shared by the Excel and PDF exports: ['header', 'rows', 'total'].
     */
    public function bankSheetTable(PayrollRun $run): array
    {
        $rows = [];
        $total = 0;
        foreach ($run->payslips()->orderBy('employee_code')->get() as $p) {
            $rows[] = [$p->employee_code, $p->employee_name, $p->bank_name, $p->bank_branch, $p->bank_account_no, $p->net_pay];
            $total += $p->net_pay;
        }

        return [
            'header' => ['Code', 'Employee', 'Bank', 'Branch', 'Account number', 'Net pay'],
            'rows' => $rows,
            'total' => ['', 'TOTAL', '', '', '', round($total, 2)],
        ];
    }

    public function bankSheetExcel(PayrollRun $run): string
    {
        $table = $this->bankSheetTable($run);

        return $this->excel(array_merge([$table['header']], $table['rows'], [$table['total']]),
            'Bank transfer', 'payroll-bank-'.$run->id.'.xlsx');
    }

    /**
     * EPF/ETF contribution rows for a month (all runs of that month, or only approved/paid).
     */
    public function epfRows(string $monthStart, bool $includeDraft, array $filters = []): array
    {
        $query = Payslip::with('payrollRun')->whereDate('month', $monthStart)
            ->where('epf_base', '>', 0)
            ->whereHas('payrollRun', function ($q) use ($includeDraft) {
                if (! $includeDraft) {
                    $q->where('status', '!=', PayrollRun::STATUS_DRAFT);
                }
            })
            ->when($filters['warehouse_id'] ?? null, fn ($q, $v) => $q->whereHas('employee', fn ($e) => $e->where('warehouse_id', $v)))
            ->orderBy('employee_code');

        return $query->get()->map(fn (Payslip $p) => [
            'payslip_id' => $p->id,
            'employee_code' => $p->employee_code,
            'employee_name' => $p->employee_name,
            'nic' => $p->nic,
            'epf_no' => $p->epf_no,
            'branch_name' => $p->branch_name,
            'run_status' => optional($p->payrollRun)->status,
            'epf_base' => $p->epf_base,
            'epf_employee' => $p->epf_employee,
            'epf_employer' => $p->epf_employer,
            'epf_total' => round($p->epf_employee + $p->epf_employer, 2),
            'etf' => $p->etf,
        ])->values()->all();
    }

    /**
     * EPF/ETF table shared by the Excel and PDF exports: ['header', 'rows', 'total'].
     */
    public function epfTable(string $monthStart, bool $includeDraft, array $filters = []): array
    {
        $rows = [];
        $sum = ['epf_base' => 0, 'epf_employee' => 0, 'epf_employer' => 0, 'epf_total' => 0, 'etf' => 0];
        foreach ($this->epfRows($monthStart, $includeDraft, $filters) as $r) {
            $rows[] = [$r['employee_code'], $r['employee_name'], $r['nic'], $r['epf_no'], $r['branch_name'], $r['epf_base'],
                $r['epf_employee'], $r['epf_employer'], $r['epf_total'], $r['etf']];
            foreach ($sum as $k => $v) {
                $sum[$k] += $r[$k];
            }
        }

        return [
            'header' => ['Code', 'Employee', 'NIC', 'EPF no', 'Branch', 'Total earnings (EPF base)', 'EPF employee', 'EPF employer',
                'EPF total', 'ETF'],
            'rows' => $rows,
            'total' => ['', 'TOTAL', '', '', '', round($sum['epf_base'], 2), round($sum['epf_employee'], 2),
                round($sum['epf_employer'], 2), round($sum['epf_total'], 2), round($sum['etf'], 2)],
        ];
    }

    public function epfExcel(string $monthStart, bool $includeDraft, array $filters = []): string
    {
        $table = $this->epfTable($monthStart, $includeDraft, $filters);
        $label = Carbon::parse($monthStart)->format('Y-m');

        return $this->excel(array_merge([$table['header']], $table['rows'], [$table['total']]),
            'EPF ETF '.$label, 'payroll-epf-etf-'.$label.'.xlsx');
    }

    /**
     * PDF of a shared table (runSummaryTable / bankSheetTable / epfTable).
     *
     * @param  int[]  $moneyCols  column indexes formatted as money (right-aligned)
     * @param  int[]  $numCols    other right-aligned numeric column indexes
     */
    public function tablePdf(array $table, array $moneyCols, array $numCols, string $title, ?string $subtitle,
        array $meta, string $file): string
    {
        $format = function (array $row) use ($moneyCols) {
            foreach ($moneyCols as $i) {
                if (isset($row[$i]) && $row[$i] !== '') {
                    $row[$i] = number_format((float) $row[$i], 2);
                }
            }

            return $row;
        };
        $columns = [];
        foreach ($table['header'] as $i => $label) {
            $columns[] = ['label' => $label, 'num' => in_array($i, $moneyCols, true) || in_array($i, $numCols, true)];
        }

        return app(\App\Services\ReportPdfService::class)->table([
            'title' => $title,
            'subtitle' => $subtitle,
            'meta' => $meta,
            'columns' => $columns,
            'rows' => array_map($format, $table['rows']),
            'foot' => $format($table['total']),
            'empty' => 'No records',
        ], $file);
    }

    private function excel(array $rows, string $title, string $file): string
    {
        $path = 'excel/'.$file;
        if (Storage::exists($path)) {
            Storage::delete($path);
        }
        Excel::store(new PayrollArrayExport($rows, $title), $path);

        return Storage::url($path);
    }

    private function currency(): string
    {
        try {
            return (string) getCurrencyCode();
        } catch (\Throwable $e) {
            return '';
        }
    }

    /**
     * Company logo as a data URI read from the local file (never over HTTP: the dev server is single-threaded).
     */
    private function logoDataUri(): ?string
    {
        try {
            $url = getLogoUrl();
            $path = null;
            $marker = '/uploads/';
            if ($url && ($pos = strpos($url, $marker)) !== false) {
                $path = public_path('uploads/'.str_replace('\\', '/', substr($url, $pos + strlen($marker))));
            } elseif ($url && ! str_starts_with($url, 'http')) {
                $path = public_path(ltrim($url, '/'));
            } elseif ($url && str_starts_with($url, url('/'))) {
                $path = public_path(ltrim(substr($url, strlen(url('/'))), '/'));
            }
            if ($path && is_file($path)) {
                $mime = mime_content_type($path) ?: 'image/png';

                return 'data:'.$mime.';base64,'.base64_encode(file_get_contents($path));
            }
        } catch (\Throwable $e) {
            // no logo
        }

        return null;
    }
}
