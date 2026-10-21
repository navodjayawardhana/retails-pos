<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Services\Reports\ReportSummaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * KPI cards + chart series shown above each report table.
 * GET report-summary/{type}  (type-specific params: start_date, end_date, warehouse_id,
 * department_id, month, year, id)
 */
class ReportSummaryAPIController extends AppBaseController
{
    /** type => [service method, permission the report screen is gated by] */
    const TYPES = [
        'sales' => ['sales', 'manage_reports'],
        'purchases' => ['purchases', 'manage_reports'],
        'stock' => ['stock', 'manage_reports'],
        'top-selling' => ['topSelling', 'manage_reports'],
        'warehouse' => ['warehouse', 'manage_reports'],
        'suppliers' => ['suppliers', 'manage_reports'],
        'supplier' => ['supplierDetail', 'manage_reports'],
        'customers' => ['customers', 'manage_reports'],
        'customer' => ['customerDetail', 'manage_reports'],
        'best-customers' => ['bestCustomers', 'manage_reports'],
        'profit-loss' => ['profitLoss', 'manage_reports'],
        'register' => ['register', 'manage_reports'],
        'stock-alerts' => ['stockAlerts', 'manage_reports'],
        'attendance' => ['attendance', 'manage_attendance'],
        'leave' => ['leave', 'manage_leave'],
        'payroll' => ['payroll', 'manage_payroll'],
    ];

    public function show(Request $request, ReportSummaryService $service, string $type): JsonResponse
    {
        // No 403/404 here on purpose: the frontend axios interceptor redirects the whole
        // page to the dashboard on those, and this is only a decoration above the table.
        if (! isset(self::TYPES[$type])) {
            return $this->sendError('Unknown report type.');
        }
        [$method, $permission] = self::TYPES[$type];

        if (! $this->allowed($request, $permission)) {
            return $this->sendResponse(['period' => null, 'kpis' => [], 'charts' => [], 'forbidden' => true],
                'You do not have permission to view this report.');
        }

        $data = in_array($type, ['supplier', 'customer'], true)
            ? $service->$method($request, (int) $request->get('id'))
            : $service->$method($request);

        return $this->sendResponse($data, 'Report summary retrieved successfully.');
    }

    protected function allowed(Request $request, string $permission): bool
    {
        $user = $request->user();
        try {
            return $user && $user->hasPermissionTo($permission);
        } catch (\Throwable $e) {
            // permission not seeded on this install: fall back to the route's auth only
            return (bool) $user;
        }
    }
}
