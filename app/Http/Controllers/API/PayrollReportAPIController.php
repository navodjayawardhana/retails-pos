<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Models\HrSetting;
use App\Services\Hrm\PayrollDocumentService;
use App\Services\Hrm\PayrollService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollReportAPIController extends AppBaseController
{
    /**
     * GET payroll-reports/epf?month=YYYY-MM&include_draft=0&warehouse_id=
     */
    public function epf(Request $request, PayrollService $payroll, PayrollDocumentService $documents): JsonResponse
    {
        $month = $payroll->monthStart($request->get('month') ?: Carbon::parse(HrSetting::today())->format('Y-m'));
        $rows = $documents->epfRows($month, $request->boolean('include_draft'), $request->only(['warehouse_id']));
        $totals = [];
        foreach (['epf_base', 'epf_employee', 'epf_employer', 'epf_total', 'etf'] as $key) {
            $totals[$key] = round(array_sum(array_column($rows, $key)), 2);
        }

        return $this->sendResponse(['month' => substr($month, 0, 7), 'rows' => $rows, 'totals' => $totals],
            'EPF/ETF report retrieved successfully');
    }

    public function epfExcel(Request $request, PayrollService $payroll, PayrollDocumentService $documents): JsonResponse
    {
        $month = $payroll->monthStart($request->get('month') ?: Carbon::parse(HrSetting::today())->format('Y-m'));
        $url = $documents->epfExcel($month, $request->boolean('include_draft'), $request->only(['warehouse_id']));

        return $this->sendResponse(['payroll_excel_url' => $url], 'EPF/ETF export created successfully');
    }

    public function epfPdf(Request $request, PayrollService $payroll, PayrollDocumentService $documents): JsonResponse
    {
        $month = $payroll->monthStart($request->get('month') ?: Carbon::parse(HrSetting::today())->format('Y-m'));
        $includeDraft = $request->boolean('include_draft');
        $filters = $request->only(['warehouse_id']);
        $branch = ! empty($filters['warehouse_id']) ? optional(\App\Models\Warehouse::find($filters['warehouse_id']))->name : null;
        $label = Carbon::parse($month)->format('Y-m');

        $url = $documents->tablePdf($documents->epfTable($month, $includeDraft, $filters), [5, 6, 7, 8, 9], [],
            'EPF / ETF CONTRIBUTIONS', Carbon::parse($month)->format('F Y'), [
                'Period' => Carbon::parse($month)->format('M Y'),
                'Branch' => $branch ?: 'All branches',
                'Includes drafts' => $includeDraft ? 'Yes' : 'No',
                'EPF rates' => (float) HrSetting::get('epf_employee_rate').'% / '.(float) HrSetting::get('epf_employer_rate').'%',
                'ETF rate' => (float) HrSetting::get('etf_rate').'%',
            ], 'payroll-epf-etf-'.$label.'.pdf');

        return $this->sendResponse(['payroll_pdf_url' => $url], 'EPF/ETF PDF created successfully');
    }
}
