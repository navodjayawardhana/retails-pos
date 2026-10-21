<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Http\Resources\PayslipCollection;
use App\Http\Resources\PayslipResource;
use App\Models\Payslip;
use App\Services\Hrm\PayrollDocumentService;
use App\Services\Hrm\PayrollService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayslipAPIController extends AppBaseController
{
    /**
     * Filters: payroll_run_id, employee_id, month (YYYY-MM).
     */
    public function index(Request $request): PayslipCollection
    {
        $query = Payslip::with('payrollRun')
            ->when($request->get('payroll_run_id'), fn ($q, $v) => $q->where('payroll_run_id', $v))
            ->when($request->get('employee_id'), fn ($q, $v) => $q->where('employee_id', $v))
            ->when($request->get('month'), fn ($q, $v) => $q->whereDate('month', $v.'-01'))
            ->orderBy('month', 'desc')->orderBy('employee_code');

        $perPage = (int) getPageSize($request);
        $slips = $query->paginate($perPage > 0 ? $perPage : max(1, (clone $query)->count()));
        PayslipResource::usingWithCollection();

        return new PayslipCollection($slips);
    }

    public function show($id): PayslipResource
    {
        return new PayslipResource(Payslip::with('payrollRun')->findOrFail($id));
    }

    public function pdf($id, PayrollDocumentService $documents): JsonResponse
    {
        $payslip = Payslip::findOrFail($id);
        $url = $documents->payslipPdf(collect([$payslip]), 'payslip-'.$payslip->employee_code.'-'.$payslip->month->format('Y-m').'-'.$payslip->id.'.pdf');

        return $this->sendResponse(['payslip_pdf_url' => $url], 'Payslip PDF created successfully');
    }

    /**
     * POST payslips/{id}/adjustments {type: earning|deduction, label, amount, epf_liable?} — draft runs only.
     */
    public function addAdjustment(Request $request, $id, PayrollService $payroll): PayslipResource
    {
        $data = $request->validate([
            'type' => 'required|in:earning,deduction',
            'label' => 'required|max:191',
            'amount' => 'required|numeric|min:0.01',
            'epf_liable' => 'nullable|boolean',
            'basis' => 'nullable|max:191',
        ]);
        $payslip = $payroll->addAdjustment(Payslip::findOrFail($id), $data);

        return new PayslipResource($payslip->fresh('payrollRun'));
    }

    public function removeAdjustment($id, $itemId, PayrollService $payroll): PayslipResource
    {
        $payslip = $payroll->removeAdjustment(Payslip::findOrFail($id), (int) $itemId);

        return new PayslipResource($payslip->fresh('payrollRun'));
    }
}
