<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Http\Resources\PayrollRunCollection;
use App\Http\Resources\PayrollRunResource;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Services\Hrm\PayrollDocumentService;
use App\Services\Hrm\PayrollService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PayrollRunAPIController extends AppBaseController
{
    private PayrollService $payroll;

    public function __construct(PayrollService $payroll)
    {
        $this->payroll = $payroll;
    }

    /**
     * Filters: status, year, warehouse_id, department_id.
     */
    public function index(Request $request): PayrollRunCollection
    {
        $query = PayrollRun::with(['warehouse', 'department', 'approver'])
            ->when($request->get('status'), fn ($q, $v) => $q->where('status', $v))
            ->when($request->get('year'), fn ($q, $v) => $q->whereYear('month', $v))
            ->when($request->get('warehouse_id'), fn ($q, $v) => $q->where('warehouse_id', $v))
            ->when($request->get('department_id'), fn ($q, $v) => $q->where('department_id', $v))
            ->orderBy('month', 'desc')->orderBy('id', 'desc');

        $perPage = (int) getPageSize($request);
        $runs = $query->paginate($perPage > 0 ? $perPage : max(1, (clone $query)->count()));
        PayrollRunResource::usingWithCollection();

        return new PayrollRunCollection($runs);
    }

    /**
     * POST payroll-runs {month: YYYY-MM, warehouse_id?, department_id?, notes?} — creates and calculates.
     */
    public function store(Request $request): PayrollRunResource
    {
        $data = $request->validate([
            'month' => 'required|date_format:Y-m',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'department_id' => 'nullable|exists:departments,id',
            'notes' => 'nullable|max:1000',
        ], ['month.date_format' => 'Enter the month as YYYY-MM.']);

        return new PayrollRunResource($this->payroll->createRun($data, Auth::id()));
    }

    /**
     * Run with its payslips (summary columns).
     */
    public function show($id): JsonResponse
    {
        $run = PayrollRun::with(['warehouse', 'department', 'approver'])->findOrFail($id);
        $payslips = $run->payslips()->orderBy('employee_code')->get()->map(fn (Payslip $p) => [
            'id' => $p->id,
            'employee_id' => $p->employee_id,
            'employee_code' => $p->employee_code,
            'employee_name' => $p->employee_name,
            'branch_name' => $p->branch_name,
            'department_name' => $p->department_name,
            'designation_name' => $p->designation_name,
            'salary_type' => $p->salary_type,
            'payable_days' => $p->payable_days,
            'absent_days' => $p->absent_days,
            'ot_hours' => $p->ot_hours,
            'gross_earnings' => $p->gross_earnings,
            'total_deductions' => $p->total_deductions,
            'net_pay' => $p->net_pay,
            'epf_employee' => $p->epf_employee,
            'epf_employer' => $p->epf_employer,
            'etf' => $p->etf,
        ])->values();

        return $this->sendResponse([
            'run' => array_merge(['id' => $run->id], $run->prepareAttributes()),
            'payslips' => $payslips,
        ], 'Payroll run retrieved successfully');
    }

    public function destroy($id): JsonResponse
    {
        $this->payroll->deleteRun(PayrollRun::findOrFail($id));

        return $this->sendSuccess('Payroll run deleted successfully');
    }

    public function recalculate($id): JsonResponse
    {
        $run = $this->payroll->calculate(PayrollRun::findOrFail($id));

        return $this->sendResponse(array_merge(['id' => $run->id], $run->prepareAttributes()), 'Payroll recalculated successfully');
    }

    public function approve($id): JsonResponse
    {
        $run = $this->payroll->approve(PayrollRun::findOrFail($id), Auth::id());

        return $this->sendResponse(array_merge(['id' => $run->id], $run->prepareAttributes()), 'Payroll approved');
    }

    /**
     * POST payroll-runs/{id}/pay {create_expense: bool (default true), paid_date?}
     */
    public function pay(Request $request, $id): JsonResponse
    {
        $request->validate(['paid_date' => 'nullable|date']);
        $createExpense = $request->has('create_expense') ? $request->boolean('create_expense') : true;
        $run = $this->payroll->markPaid(PayrollRun::findOrFail($id), $createExpense, $request->get('paid_date'), Auth::id());

        return $this->sendResponse(array_merge(['id' => $run->id], $run->prepareAttributes()), 'Payroll marked as paid');
    }

    /**
     * GET payroll-runs/{id}/pdf → all payslips in one PDF.
     */
    public function pdf($id, PayrollDocumentService $documents): JsonResponse
    {
        $run = PayrollRun::findOrFail($id);
        $payslips = $run->payslips()->orderBy('employee_code')->get();
        if ($payslips->isEmpty()) {
            return $this->sendError('This run has no payslips.');
        }
        $url = $documents->payslipPdf($payslips, 'payslips-'.$run->month->format('Y-m').'-run'.$run->id.'.pdf');

        return $this->sendResponse(['payslip_pdf_url' => $url], 'Payslips PDF created successfully');
    }

    public function summaryExcel($id, PayrollDocumentService $documents): JsonResponse
    {
        $url = $documents->runSummaryExcel(PayrollRun::findOrFail($id));

        return $this->sendResponse(['payroll_excel_url' => $url], 'Payroll summary export created successfully');
    }

    public function bankExcel($id, PayrollDocumentService $documents): JsonResponse
    {
        $url = $documents->bankSheetExcel(PayrollRun::findOrFail($id));

        return $this->sendResponse(['payroll_excel_url' => $url], 'Bank transfer sheet created successfully');
    }
}
