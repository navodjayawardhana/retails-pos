<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Http\Resources\PayslipResource;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Services\Hrm\PayrollDocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

/**
 * Self service payslips (view_own_hr): only payslips of approved or paid runs.
 */
class MyPayslipAPIController extends AppBaseController
{
    public function index(): JsonResponse
    {
        $employee = $this->myEmployee();
        if (! $employee) {
            return $this->sendError('Your login is not linked to an active employee.');
        }
        $payslips = $this->query($employee)->orderBy('month', 'desc')->get()
            ->map(fn (Payslip $p) => array_merge(['id' => $p->id], $p->prepareAttributes()))->values();

        return $this->sendResponse([
            'employee' => ['id' => $employee->id, 'employee_code' => $employee->employee_code, 'full_name' => $employee->full_name],
            'payslips' => $payslips,
        ], 'Payslips retrieved successfully');
    }

    public function show($id)
    {
        $employee = $this->myEmployee();
        $payslip = $employee ? $this->query($employee)->where('id', $id)->first() : null;
        if (! $payslip) {
            return $this->sendError('Payslip not found.');
        }

        return new PayslipResource($payslip);
    }

    public function pdf($id, PayrollDocumentService $documents): JsonResponse
    {
        $employee = $this->myEmployee();
        $payslip = $employee ? $this->query($employee)->where('id', $id)->first() : null;
        if (! $payslip) {
            return $this->sendError('Payslip not found.');
        }
        $url = $documents->payslipPdf(collect([$payslip]), 'payslip-'.$payslip->employee_code.'-'.$payslip->month->format('Y-m').'-'.$payslip->id.'.pdf');

        return $this->sendResponse(['payslip_pdf_url' => $url], 'Payslip PDF created successfully');
    }

    private function query(Employee $employee)
    {
        return Payslip::with('payrollRun')->where('employee_id', $employee->id)
            ->whereHas('payrollRun', fn ($q) => $q->where('status', '!=', PayrollRun::STATUS_DRAFT));
    }

    private function myEmployee(): ?Employee
    {
        return Employee::where('user_id', Auth::id())->first();
    }
}
