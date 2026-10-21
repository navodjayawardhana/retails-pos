<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Http\Resources\EmployeeLoanCollection;
use App\Http\Resources\EmployeeLoanResource;
use App\Models\EmployeeLoan;
use App\Models\HrSetting;
use App\Models\LoanRepayment;
use App\Services\Hrm\PayrollService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class EmployeeLoanAPIController extends AppBaseController
{
    /**
     * Filters: employee_id, status, type, warehouse_id, filter[search] (employee code/name).
     */
    public function index(Request $request): EmployeeLoanCollection
    {
        $query = EmployeeLoan::with(['employee.warehouse'])
            ->when($request->get('employee_id'), fn ($q, $v) => $q->where('employee_id', $v))
            ->when($request->get('status'), fn ($q, $v) => $q->where('status', $v))
            ->when($request->get('type'), fn ($q, $v) => $q->where('type', $v))
            ->when($request->get('warehouse_id'), fn ($q, $v) => $q->whereHas('employee', fn ($e) => $e->where('warehouse_id', $v)));
        $search = $request->input('filter.search');
        if ($search) {
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('employee_code', 'like', '%'.$search.'%')
                    ->orWhere('first_name', 'like', '%'.$search.'%')
                    ->orWhere('last_name', 'like', '%'.$search.'%');
            });
        }
        $query->orderByRaw("FIELD(status, 'active', 'completed', 'cancelled')")->orderBy('id', 'desc');

        $perPage = (int) getPageSize($request);
        $loans = $query->paginate($perPage > 0 ? $perPage : max(1, (clone $query)->count()));
        EmployeeLoanResource::usingWithCollection();

        return new EmployeeLoanCollection($loans);
    }

    public function store(Request $request, PayrollService $payroll): EmployeeLoanResource
    {
        $data = $this->validated($request);
        $installments = max(1, (int) ($data['installments'] ?? 1));
        $monthly = isset($data['monthly_installment']) && $data['monthly_installment'] !== null
            ? (float) $data['monthly_installment']
            : round((float) $data['amount'] / $installments, 2);
        if (! empty($data['monthly_installment'])) {
            $installments = (int) ceil((float) $data['amount'] / $monthly);
        }

        $loan = EmployeeLoan::create([
            'employee_id' => $data['employee_id'],
            'type' => $data['type'],
            'amount' => $data['amount'],
            'installments' => $installments,
            'monthly_installment' => $monthly,
            'issued_date' => $data['issued_date'] ?? HrSetting::today(),
            'start_month' => $payroll->monthStart($data['start_month']),
            'balance' => $data['amount'],
            'status' => EmployeeLoan::STATUS_ACTIVE,
            'reason' => $data['reason'] ?? null,
            'created_by' => Auth::id(),
        ]);

        return new EmployeeLoanResource($loan->fresh('employee'));
    }

    public function show($id): EmployeeLoanResource
    {
        return new EmployeeLoanResource(EmployeeLoan::with('employee')->findOrFail($id));
    }

    /**
     * Editing is allowed only before any repayment was recorded.
     */
    public function update(Request $request, $id, PayrollService $payroll)
    {
        $loan = EmployeeLoan::findOrFail($id);
        if ($loan->repayments()->exists()) {
            return $this->sendError('This loan already has repayments, so it can no longer be edited. Settle or cancel it instead.');
        }
        $data = $this->validated($request);
        $installments = max(1, (int) ($data['installments'] ?? 1));
        $monthly = ! empty($data['monthly_installment']) ? (float) $data['monthly_installment'] : round((float) $data['amount'] / $installments, 2);
        if (! empty($data['monthly_installment'])) {
            $installments = (int) ceil((float) $data['amount'] / $monthly);
        }
        $loan->update([
            'employee_id' => $data['employee_id'],
            'type' => $data['type'],
            'amount' => $data['amount'],
            'installments' => $installments,
            'monthly_installment' => $monthly,
            'issued_date' => $data['issued_date'] ?? $loan->issued_date,
            'start_month' => $payroll->monthStart($data['start_month']),
            'balance' => $data['amount'],
            'reason' => $data['reason'] ?? null,
        ]);

        return new EmployeeLoanResource($loan->fresh('employee'));
    }

    public function destroy($id): JsonResponse
    {
        $loan = EmployeeLoan::findOrFail($id);
        if ($loan->repayments()->exists()) {
            return $this->sendError('This loan has repayments and cannot be deleted. Cancel it instead.');
        }
        $loan->delete();

        return $this->sendSuccess('Loan deleted successfully');
    }

    /**
     * POST employee-loans/{id}/settle {amount?, date?, notes?} — manual (early) repayment; full balance if no amount.
     */
    public function settle(Request $request, $id, PayrollService $payroll): JsonResponse
    {
        $loan = EmployeeLoan::findOrFail($id);
        if ($loan->status !== EmployeeLoan::STATUS_ACTIVE) {
            return $this->sendError('Only an active loan can be settled.');
        }
        $request->validate([
            'amount' => 'nullable|numeric|min:0.01',
            'date' => 'nullable|date',
            'notes' => 'nullable|max:1000',
        ]);
        $amount = $request->filled('amount') ? (float) $request->get('amount') : $loan->balance;
        if ($amount > $loan->balance + 0.001) {
            return $this->sendError('The amount is more than the remaining balance ('.number_format($loan->balance, 2).').');
        }

        DB::transaction(function () use ($loan, $amount, $request, $payroll) {
            LoanRepayment::create([
                'employee_loan_id' => $loan->id,
                'amount' => round($amount, 2),
                'date' => $request->get('date') ?: HrSetting::today(),
                'type' => 'manual',
                'notes' => $request->get('notes'),
                'created_by' => Auth::id(),
            ]);
            $payroll->applyRepayment($loan, $amount);
        });

        return $this->sendResponse(new EmployeeLoanResource($loan->fresh('employee')), 'Repayment recorded successfully');
    }

    public function cancel($id): JsonResponse
    {
        $loan = EmployeeLoan::findOrFail($id);
        if ($loan->status !== EmployeeLoan::STATUS_ACTIVE) {
            return $this->sendError('Only an active loan can be cancelled.');
        }
        $loan->update(['status' => EmployeeLoan::STATUS_CANCELLED]);

        return $this->sendResponse(new EmployeeLoanResource($loan->fresh('employee')), 'Loan cancelled');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'type' => 'required|in:advance,loan',
            'amount' => 'required|numeric|min:1',
            'installments' => 'nullable|integer|min:1|max:120',
            'monthly_installment' => 'nullable|numeric|min:1',
            'issued_date' => 'nullable|date',
            'start_month' => 'required',
            'reason' => 'nullable|max:1000',
        ], [
            'start_month.required' => 'Choose the first payroll month that deducts this.',
        ]);
    }
}
