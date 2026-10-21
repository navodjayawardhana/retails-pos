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
}
