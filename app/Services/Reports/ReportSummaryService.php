<?php

namespace App\Services\Reports;

use App\Models\HrSetting;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Whole-period aggregates (KPI cards + chart series) for the report screens.
 * The report tables are paginated, so these are computed separately with SQL
 * aggregates for the same filters the table uses.
 */
class ReportSummaryService
{
    const COLORS = ['#1E3A8A', '#0AC074', '#FFB821', '#0099FB', '#F62947', '#6275AD', '#9AA6CA'];

    // ---------------------------------------------------------------- helpers

    /**
     * [start, end, prevStart, prevEnd, label] — falls back to the last 30 days
     * when the report has no date range selected.
     */
    protected function period(Request $request, int $defaultDays = 30): array
    {
        $start = $this->dateParam($request, 'start_date');
        $end = $this->dateParam($request, 'end_date');
        $isDefault = ! $start || ! $end;
        if ($isDefault) {
            $end = Carbon::today();
            $start = Carbon::today()->subDays($defaultDays - 1);
        }
        if ($start->gt($end)) {
            [$start, $end] = [$end, $start];
        }
        $days = $start->diffInDays($end) + 1;
        $prevEnd = $start->copy()->subDay();
        $prevStart = $prevEnd->copy()->subDays($days - 1);

        return [
            'start' => $start->toDateString(),
            'end' => $end->toDateString(),
            'prev_start' => $prevStart->toDateString(),
            'prev_end' => $prevEnd->toDateString(),
            'days' => $days,
            'is_default' => $isDefault,
        ];
    }

    protected function dateParam(Request $request, string $key): ?Carbon
    {
        $value = $request->get($key);
        if (! $value || $value === 'null' || $value === 'undefined') {
            return null;
        }
        try {
            return Carbon::parse($value)->startOfDay();
        } catch (\Throwable $e) {
            return null;
        }
    }

    protected function warehouseId(Request $request): ?int
    {
        $id = $request->get('warehouse_id');

        return ($id && $id !== 'null' && $id !== 'undefined' && (int) $id > 0) ? (int) $id : null;
    }

    protected function kpi(string $key, string $label, $value, $previous = null, string $format = 'currency'): array
    {
        $value = round((float) $value, 2);
        $change = null;
        if ($previous !== null) {
            $previous = round((float) $previous, 2);
            if ($previous != 0.0) {
                $change = round((($value - $previous) / abs($previous)) * 100, 1);
            } elseif ($value == 0.0) {
                $change = 0.0;
            }
            // previous period empty: no baseline, so no % (a "+100%" would be misleading)
        }

        return [
            'key' => $key,
            'label_key' => $label,
            'value' => $value,
            'previous' => $previous,
            'change_pct' => $change,
            'format' => $format,
        ];
    }

    /** Sum/count grouped by day, every day in range filled (0 when empty). */
    protected function daily($query, string $dateColumn, string $expr, array $p): array
    {
        $rows = (clone $query)
            ->whereBetween($dateColumn, [$p['start'], $p['end']])
            ->selectRaw("DATE($dateColumn) as d, $expr as v")
            ->groupBy('d')
            ->pluck('v', 'd');
        $categories = [];
        $data = [];
        foreach (CarbonPeriod::create($p['start'], $p['end']) as $day) {
            $key = $day->toDateString();
            $categories[] = $key;
            $data[] = round((float) ($rows[$key] ?? 0), 2);
        }

        return [$categories, $data];
    }

    /** Last N months (YYYY-MM) ending with $endMonth. */
    protected function months(Carbon $endMonth, int $count = 12): array
    {
        $months = [];
        for ($i = $count - 1; $i >= 0; $i--) {
            $months[] = $endMonth->copy()->startOfMonth()->subMonths($i)->format('Y-m');
        }

        return $months;
    }

    protected function monthly($query, string $dateColumn, string $expr, array $months): array
    {
        $start = $months[0].'-01';
        $end = Carbon::parse(end($months).'-01')->endOfMonth()->toDateString();
        $rows = (clone $query)
            ->whereBetween($dateColumn, [$start, $end])
            ->selectRaw("DATE_FORMAT($dateColumn, '%Y-%m') as m, $expr as v")
            ->groupBy('m')
            ->pluck('v', 'm');

        return array_map(fn ($m) => round((float) ($rows[$m] ?? 0), 2), $months);
    }

    protected function wrap(?array $p = null, array $kpis = [], array $charts = []): array
    {
        return [
            'period' => $p ? ['start' => $p['start'], 'end' => $p['end'], 'is_default' => $p['is_default']] : null,
            'kpis' => $kpis,
            'charts' => $charts,
        ];
    }

    // ------------------------------------------------------------ store reports

    public function sales(Request $request): array
    {
        $p = $this->period($request);
        $wh = $this->warehouseId($request);
        $base = DB::table('sales')->when($wh, fn ($q) => $q->where('warehouse_id', $wh));
        $agg = fn ($from, $to) => (clone $base)->whereBetween('date', [$from, $to])
            ->selectRaw('COALESCE(SUM(grand_total),0) total, COALESCE(SUM(paid_amount),0) paid, COUNT(*) cnt')->first();
        $cur = $agg($p['start'], $p['end']);
        $prev = $agg($p['prev_start'], $p['prev_end']);

        [$days, $trend] = $this->daily($base, 'date', 'SUM(grand_total)', $p);
        $byStatus = (clone $base)->whereBetween('date', [$p['start'], $p['end']])
            ->selectRaw('payment_status s, COUNT(*) c')->groupBy('s')->pluck('c', 's');
        $byWarehouse = (clone $base)->whereBetween('sales.date', [$p['start'], $p['end']])
            ->join('warehouses', 'warehouses.id', '=', 'sales.warehouse_id')
            ->selectRaw('warehouses.name n, SUM(sales.grand_total) v')->groupBy('n')->orderByDesc('v')->limit(10)->get();

        return $this->wrap($p, [
            $this->kpi('total_sales', 'report-summary.total-sales', $cur->total, $prev->total),
            $this->kpi('paid', 'report-summary.received', $cur->paid, $prev->paid),
            $this->kpi('due', 'report-summary.due', $cur->total - $cur->paid, $prev->total - $prev->paid),
            $this->kpi('orders', 'report-summary.orders', $cur->cnt, $prev->cnt, 'number'),
            $this->kpi('avg', 'report-summary.avg-order', $cur->cnt ? $cur->total / $cur->cnt : 0,
                $prev->cnt ? $prev->total / $prev->cnt : 0),
        ], [
            ['type' => 'area', 'title_key' => 'report-summary.chart.sales-trend', 'categories' => $days,
                'series' => [['name_key' => 'report-summary.total-sales', 'data' => $trend]], 'format' => 'currency', 'span' => 2],
            ['type' => 'donut', 'title_key' => 'report-summary.chart.payment-status',
                'labels_key' => ['payment-status.filter.paid.label', 'payment-status.filter.unpaid.label', 'payment-status.filter.partial.label'],
                'series' => [(int) ($byStatus[1] ?? 0), (int) ($byStatus[2] ?? 0), (int) ($byStatus[3] ?? 0)], 'format' => 'number',
                'colors' => ['#0AC074', '#F62947', '#FFB821']],
            ['type' => 'bar', 'title_key' => 'report-summary.chart.by-warehouse', 'horizontal' => true, 'span' => 3,
                'categories' => $byWarehouse->pluck('n'),
                'series' => [['name_key' => 'report-summary.total-sales', 'data' => $byWarehouse->pluck('v')->map(fn ($v) => round($v, 2))]],
                'format' => 'currency'],
        ]);
    }

    public function purchases(Request $request): array
    {
        $p = $this->period($request);
        $wh = $this->warehouseId($request);
        $base = DB::table('purchases')->when($wh, fn ($q) => $q->where('purchases.warehouse_id', $wh));
        $agg = fn ($from, $to) => (clone $base)->whereBetween('date', [$from, $to])
            ->selectRaw('COALESCE(SUM(grand_total),0) total, COALESCE(SUM(paid_amount),0) paid, COUNT(*) cnt')->first();
        $cur = $agg($p['start'], $p['end']);
        $prev = $agg($p['prev_start'], $p['prev_end']);
        [$days, $trend] = $this->daily($base, 'date', 'SUM(grand_total)', $p);
        $bySupplier = (clone $base)->whereBetween('purchases.date', [$p['start'], $p['end']])
            ->join('suppliers', 'suppliers.id', '=', 'purchases.supplier_id')
            ->selectRaw('suppliers.name n, SUM(purchases.grand_total) v')->groupBy('n')->orderByDesc('v')->limit(10)->get();

        return $this->wrap($p, [
            $this->kpi('total_purchases', 'report-summary.total-purchases', $cur->total, $prev->total),
            $this->kpi('paid', 'report-summary.paid', $cur->paid, $prev->paid),
            $this->kpi('due', 'report-summary.due', $cur->total - $cur->paid, $prev->total - $prev->paid),
            $this->kpi('orders', 'report-summary.orders', $cur->cnt, $prev->cnt, 'number'),
        ], [
            ['type' => 'area', 'title_key' => 'report-summary.chart.purchase-trend', 'categories' => $days,
                'series' => [['name_key' => 'report-summary.total-purchases', 'data' => $trend]], 'format' => 'currency', 'span' => 2],
            ['type' => 'bar', 'title_key' => 'report-summary.chart.top-suppliers', 'horizontal' => true,
                'categories' => $bySupplier->pluck('n'),
                'series' => [['name_key' => 'report-summary.total-purchases', 'data' => $bySupplier->pluck('v')->map(fn ($v) => round($v, 2))]],
                'format' => 'currency'],
        ]);
    }

    public function stock(Request $request): array
    {
        $wh = $this->warehouseId($request);
        $base = DB::table('manage_stocks')
            ->join('products', 'products.id', '=', 'manage_stocks.product_id')
            ->when($wh, fn ($q) => $q->where('manage_stocks.warehouse_id', $wh));
        $agg = (clone $base)->selectRaw('COALESCE(SUM(manage_stocks.quantity),0) qty,
                COALESCE(SUM(manage_stocks.quantity * products.product_cost),0) cost_value,
                COALESCE(SUM(manage_stocks.quantity * products.product_price),0) price_value,
                SUM(CASE WHEN manage_stocks.quantity <= 0 THEN 1 ELSE 0 END) out_cnt,
                SUM(CASE WHEN manage_stocks.quantity > 0 AND manage_stocks.quantity <= COALESCE(products.stock_alert,0) THEN 1 ELSE 0 END) low_cnt,
                COUNT(*) items')->first();
        $byCategory = (clone $base)
            ->leftJoin('product_categories', 'product_categories.id', '=', 'products.product_category_id')
            ->selectRaw('COALESCE(product_categories.name, "-") n, SUM(manage_stocks.quantity * products.product_cost) v')
            ->groupBy('n')->orderByDesc('v')->limit(10)->get();
        $inStock = max(0, $agg->items - $agg->out_cnt - $agg->low_cnt);

        return $this->wrap(null, [
            $this->kpi('stock_value', 'report-summary.stock-value-cost', $agg->cost_value),
            $this->kpi('retail_value', 'report-summary.stock-value-retail', $agg->price_value),
            $this->kpi('units', 'report-summary.units-in-stock', $agg->qty, null, 'number'),
            $this->kpi('low', 'report-summary.low-stock', $agg->low_cnt, null, 'number'),
            $this->kpi('out', 'report-summary.out-of-stock', $agg->out_cnt, null, 'number'),
        ], [
            ['type' => 'bar', 'title_key' => 'report-summary.chart.stock-by-category', 'categories' => $byCategory->pluck('n'),
                'series' => [['name_key' => 'report-summary.stock-value-cost', 'data' => $byCategory->pluck('v')->map(fn ($v) => round($v, 2))]],
                'format' => 'currency', 'span' => 2],
            ['type' => 'donut', 'title_key' => 'report-summary.chart.stock-status',
                'labels_key' => ['report-summary.in-stock', 'report-summary.low-stock', 'report-summary.out-of-stock'],
                'series' => [(int) $inStock, (int) $agg->low_cnt, (int) $agg->out_cnt], 'format' => 'number',
                'colors' => ['#0AC074', '#FFB821', '#F62947']],
        ]);
    }

    public function topSelling(Request $request): array
    {
        $p = $this->period($request);
        $base = DB::table('sale_items')->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id');
        $agg = fn ($from, $to) => (clone $base)->whereBetween('sales.date', [$from, $to])
            ->selectRaw('COALESCE(SUM(sale_items.quantity),0) qty, COALESCE(SUM(sale_items.sub_total),0) rev,
                COUNT(DISTINCT sale_items.product_id) products')->first();
        $cur = $agg($p['start'], $p['end']);
        $prev = $agg($p['prev_start'], $p['prev_end']);
        $top = (clone $base)->whereBetween('sales.date', [$p['start'], $p['end']])
            ->selectRaw('products.name n, SUM(sale_items.quantity) q, SUM(sale_items.sub_total) r')
            ->groupBy('n')->orderByDesc('q')->limit(10)->get();
        $topRev = $top->sortByDesc('r')->take(5);
        $otherRev = max(0, $cur->rev - $topRev->sum('r'));

        return $this->wrap($p, [
            $this->kpi('qty', 'report-summary.units-sold', $cur->qty, $prev->qty, 'number'),
            $this->kpi('revenue', 'report-summary.revenue', $cur->rev, $prev->rev),
            $this->kpi('products', 'report-summary.products-sold', $cur->products, $prev->products, 'number'),
        ], [
            ['type' => 'bar', 'title_key' => 'report-summary.chart.top-products-qty', 'horizontal' => true,
                'categories' => $top->pluck('n'),
                'series' => [['name_key' => 'report-summary.units-sold', 'data' => $top->pluck('q')->map(fn ($v) => round($v, 2))]],
                'format' => 'number', 'span' => 2],
            ['type' => 'donut', 'title_key' => 'report-summary.chart.revenue-share',
                'labels' => $topRev->pluck('n')->push('Others')->values(),
                'series' => $topRev->pluck('r')->map(fn ($v) => round($v, 2))->push(round($otherRev, 2))->values(),
                'format' => 'currency'],
        ]);
    }

    public function warehouse(Request $request): array
    {
        $p = $this->period($request);
        $wh = $this->warehouseId($request);
        $sum = function ($table, $col, $from, $to, $dateCol = 'date') use ($wh) {
            return (float) DB::table($table)->when($wh, fn ($q) => $q->where('warehouse_id', $wh))
                ->whereBetween($dateCol, [$from, $to])->sum($col);
        };
        $kpis = [];
        foreach ([
            ['sales', 'sales', 'grand_total', 'report-summary.total-sales'],
            ['purchases', 'purchases', 'grand_total', 'report-summary.total-purchases'],
            ['sale_returns', 'sales_return', 'grand_total', 'report-summary.sale-returns'],
            ['purchase_returns', 'purchases_return', 'grand_total', 'report-summary.purchase-returns'],
            ['expenses', 'expenses', 'amount', 'report-summary.expenses'],
        ] as [$key, $table, $col, $label]) {
            $kpis[] = $this->kpi($key, $label, $sum($table, $col, $p['start'], $p['end']), $sum($table, $col, $p['prev_start'], $p['prev_end']));
        }
        $whQ = fn ($t) => DB::table($t)->when($wh, fn ($q) => $q->where('warehouse_id', $wh));
        [$days, $sales] = $this->daily($whQ('sales'), 'date', 'SUM(grand_total)', $p);
        [, $purchases] = $this->daily($whQ('purchases'), 'date', 'SUM(grand_total)', $p);
        [, $expenses] = $this->daily($whQ('expenses'), 'date', 'SUM(amount)', $p);

        return $this->wrap($p, $kpis, [
            ['type' => 'line', 'title_key' => 'report-summary.chart.warehouse-activity', 'categories' => $days,
                'series' => [
                    ['name_key' => 'report-summary.total-sales', 'data' => $sales],
                    ['name_key' => 'report-summary.total-purchases', 'data' => $purchases],
                    ['name_key' => 'report-summary.expenses', 'data' => $expenses],
                ], 'format' => 'currency', 'span' => 3],
        ]);
    }

    public function suppliers(Request $request): array
    {
        $base = DB::table('purchases')->join('suppliers', 'suppliers.id', '=', 'purchases.supplier_id');
        $agg = (clone $base)->selectRaw('COALESCE(SUM(purchases.grand_total),0) total, COALESCE(SUM(purchases.paid_amount),0) paid,
            COUNT(DISTINCT purchases.supplier_id) active')->first();
        $suppliers = DB::table('suppliers')->count();
        $top = (clone $base)->selectRaw('suppliers.name n, SUM(purchases.grand_total) v')->groupBy('n')->orderByDesc('v')->limit(10)->get();
        $months = $this->months(Carbon::today(), 12);

        return $this->wrap(null, [
            $this->kpi('suppliers', 'report-summary.suppliers', $suppliers, null, 'number'),
            $this->kpi('total', 'report-summary.total-purchases', $agg->total),
            $this->kpi('paid', 'report-summary.paid', $agg->paid),
            $this->kpi('due', 'report-summary.due', $agg->total - $agg->paid),
        ], [
            ['type' => 'bar', 'title_key' => 'report-summary.chart.top-suppliers', 'horizontal' => true, 'categories' => $top->pluck('n'),
                'series' => [['name_key' => 'report-summary.total-purchases', 'data' => $top->pluck('v')->map(fn ($v) => round($v, 2))]],
                'format' => 'currency'],
            ['type' => 'area', 'title_key' => 'report-summary.chart.purchases-12-months', 'categories' => $months,
                'series' => [['name_key' => 'report-summary.total-purchases', 'data' => $this->monthly(DB::table('purchases'), 'date', 'SUM(grand_total)', $months)]],
                'format' => 'currency', 'span' => 2],
        ]);
    }

    public function supplierDetail(Request $request, int $supplierId): array
    {
        $purchases = DB::table('purchases')->where('supplier_id', $supplierId);
        $agg = (clone $purchases)->selectRaw('COALESCE(SUM(grand_total),0) total, COALESCE(SUM(paid_amount),0) paid, COUNT(*) cnt')->first();
        $returns = (float) DB::table('purchases_return')->where('supplier_id', $supplierId)->sum('grand_total');
        $months = $this->months(Carbon::today(), 12);

        return $this->wrap(null, [
            $this->kpi('total', 'report-summary.total-purchases', $agg->total),
            $this->kpi('paid', 'report-summary.paid', $agg->paid),
            $this->kpi('due', 'report-summary.due', $agg->total - $agg->paid),
            $this->kpi('returns', 'report-summary.purchase-returns', $returns),
            $this->kpi('orders', 'report-summary.orders', $agg->cnt, null, 'number'),
        ], [
            ['type' => 'bar', 'title_key' => 'report-summary.chart.purchases-12-months', 'categories' => $months,
                'series' => [['name_key' => 'report-summary.total-purchases', 'data' => $this->monthly(clone $purchases, 'date', 'SUM(grand_total)', $months)]],
                'format' => 'currency', 'span' => 3],
        ]);
    }

    public function customers(Request $request): array
    {
        $base = DB::table('sales')->join('customers', 'customers.id', '=', 'sales.customer_id');
        $agg = (clone $base)->selectRaw('COALESCE(SUM(sales.grand_total),0) total, COALESCE(SUM(sales.paid_amount),0) paid')->first();
        $customers = DB::table('customers')->count();
        $top = (clone $base)->selectRaw('customers.name n, SUM(sales.grand_total) v')->groupBy('n')->orderByDesc('v')->limit(10)->get();
        $months = $this->months(Carbon::today(), 12);

        return $this->wrap(null, [
            $this->kpi('customers', 'report-summary.customers', $customers, null, 'number'),
            $this->kpi('total', 'report-summary.total-sales', $agg->total),
            $this->kpi('paid', 'report-summary.received', $agg->paid),
            $this->kpi('due', 'report-summary.due', $agg->total - $agg->paid),
        ], [
            ['type' => 'bar', 'title_key' => 'report-summary.chart.top-customers', 'horizontal' => true, 'categories' => $top->pluck('n'),
                'series' => [['name_key' => 'report-summary.total-sales', 'data' => $top->pluck('v')->map(fn ($v) => round($v, 2))]],
                'format' => 'currency'],
            ['type' => 'area', 'title_key' => 'report-summary.chart.sales-12-months', 'categories' => $months,
                'series' => [['name_key' => 'report-summary.total-sales', 'data' => $this->monthly(DB::table('sales'), 'date', 'SUM(grand_total)', $months)]],
                'format' => 'currency', 'span' => 2],
        ]);
    }

    public function customerDetail(Request $request, int $customerId): array
    {
        $sales = DB::table('sales')->where('customer_id', $customerId);
        $agg = (clone $sales)->selectRaw('COALESCE(SUM(grand_total),0) total, COALESCE(SUM(paid_amount),0) paid, COUNT(*) cnt')->first();
        $returns = (float) DB::table('sales_return')->where('customer_id', $customerId)->sum('grand_total');
        $quotations = DB::table('quotations')->where('customer_id', $customerId)->count();
        $months = $this->months(Carbon::today(), 12);

        return $this->wrap(null, [
            $this->kpi('total', 'report-summary.total-sales', $agg->total),
            $this->kpi('paid', 'report-summary.received', $agg->paid),
            $this->kpi('due', 'report-summary.due', $agg->total - $agg->paid),
            $this->kpi('returns', 'report-summary.sale-returns', $returns),
            $this->kpi('orders', 'report-summary.orders', $agg->cnt, null, 'number'),
            $this->kpi('quotations', 'report-summary.quotations', $quotations, null, 'number'),
        ], [
            ['type' => 'bar', 'title_key' => 'report-summary.chart.sales-12-months', 'categories' => $months,
                'series' => [['name_key' => 'report-summary.total-sales', 'data' => $this->monthly(clone $sales, 'date', 'SUM(grand_total)', $months)]],
                'format' => 'currency', 'span' => 3],
        ]);
    }

    public function bestCustomers(Request $request): array
    {
        $rows = DB::table('sales')->join('customers', 'customers.id', '=', 'sales.customer_id')
            ->selectRaw('customers.name n, SUM(sales.grand_total) v, COUNT(*) c')->groupBy('n')->orderByDesc('v')->limit(10)->get();
        $all = (float) DB::table('sales')->sum('grand_total');
        $top5 = $rows->take(5);
        $top5Total = $top5->sum('v');

        return $this->wrap(null, [
            $this->kpi('top_total', 'report-summary.top-10-sales', $rows->sum('v')),
            $this->kpi('top5_share', 'report-summary.top-5-share', $all ? $top5Total / $all * 100 : 0, null, 'percent'),
            $this->kpi('best', 'report-summary.best-customer-sales', $rows->first()->v ?? 0),
        ], [
            ['type' => 'bar', 'title_key' => 'report-summary.chart.top-customers', 'horizontal' => true, 'categories' => $rows->pluck('n'),
                'series' => [['name_key' => 'report-summary.total-sales', 'data' => $rows->pluck('v')->map(fn ($v) => round($v, 2))]],
                'format' => 'currency', 'span' => 2],
            ['type' => 'donut', 'title_key' => 'report-summary.chart.sales-share',
                'labels' => $top5->pluck('n')->push('Others')->values(),
                'series' => $top5->pluck('v')->map(fn ($v) => round($v, 2))->push(round(max(0, $all - $top5Total), 2))->values(),
                'format' => 'currency'],
        ]);
    }

    /** Same definitions as ReportAPIController::getProfitLossReport, as SQL aggregates. */
    protected function profitFigures(string $from, string $to): array
    {
        $sales = (float) DB::table('sales')->whereBetween('date', [$from, $to])->sum('grand_total');
        $saleReturns = (float) DB::table('sales_return')->whereBetween('date', [$from, $to])->sum('grand_total');
        $expenses = (float) DB::table('expenses')->whereBetween('date', [$from, $to])->sum('amount');
        $cost = (float) DB::table('sale_items')->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->whereBetween('sales.date', [$from, $to])
            ->sum(DB::raw('sale_items.quantity * products.product_cost'));
        $returnedCost = (float) DB::table('sale_return_items')
            ->join('sales_return', 'sales_return.id', '=', 'sale_return_items.sale_return_id')
            ->join('sales', 'sales.id', '=', 'sales_return.sale_id')
            ->join('products', 'products.id', '=', 'sale_return_items.product_id')
            ->whereBetween('sales.date', [$from, $to])
            ->sum(DB::raw('sale_return_items.quantity * products.product_cost'));
        $productCost = $cost - $returnedCost;
        $gross = $sales - $productCost - $saleReturns;
        $revenue = $sales - $saleReturns;

        return [
            'revenue' => $revenue,
            'cost' => $productCost,
            'expenses' => $expenses,
            'gross' => $gross,
            'net' => $gross - $expenses,
            'margin' => $revenue ? ($gross - $expenses) / $revenue * 100 : 0,
        ];
    }

    public function profitLoss(Request $request): array
    {
        // the P&L screen defaults to month-to-date
        if (! $this->dateParam($request, 'start_date')) {
            $request->merge(['start_date' => Carbon::today()->startOfMonth()->toDateString(), 'end_date' => Carbon::today()->toDateString()]);
        }
        $p = $this->period($request);
        $cur = $this->profitFigures($p['start'], $p['end']);
        $prev = $this->profitFigures($p['prev_start'], $p['prev_end']);
        $months = $this->months(Carbon::parse($p['end']), 6);
        $monthlyNet = array_map(function ($m) {
            $from = $m.'-01';
            $to = Carbon::parse($from)->endOfMonth()->toDateString();

            return round($this->profitFigures($from, $to)['net'], 2);
        }, $months);

        return $this->wrap($p, [
            $this->kpi('revenue', 'report-summary.revenue', $cur['revenue'], $prev['revenue']),
            $this->kpi('cost', 'report-summary.product-cost', $cur['cost'], $prev['cost']),
            $this->kpi('expenses', 'report-summary.expenses', $cur['expenses'], $prev['expenses']),
            $this->kpi('gross', 'report-summary.gross-profit', $cur['gross'], $prev['gross']),
            $this->kpi('net', 'report-summary.net-profit', $cur['net'], $prev['net']),
            $this->kpi('margin', 'report-summary.net-margin', $cur['margin'], $prev['margin'], 'percent'),
        ], [
            ['type' => 'bar', 'title_key' => 'report-summary.chart.profit-breakdown', 'distributed' => true,
                'categories_key' => ['report-summary.revenue', 'report-summary.product-cost', 'report-summary.expenses', 'report-summary.net-profit'],
                'series' => [['name_key' => 'report-summary.amount', 'data' => [
                    round($cur['revenue'], 2), round($cur['cost'], 2), round($cur['expenses'], 2), round($cur['net'], 2),
                ]]], 'format' => 'currency', 'colors' => ['#1E3A8A', '#FFB821', '#F62947', '#0AC074']],
            ['type' => 'bar', 'title_key' => 'report-summary.chart.net-profit-6-months', 'categories' => $months,
                'series' => [['name_key' => 'report-summary.net-profit', 'data' => $monthlyNet]], 'format' => 'currency', 'span' => 2],
        ]);
    }

    public function register(Request $request): array
    {
        $p = $this->period($request);
        $base = DB::table('pos_register');
        $agg = fn ($from, $to) => (clone $base)->whereBetween(DB::raw('DATE(created_at)'), [$from, $to])
            ->selectRaw('COUNT(*) cnt, COALESCE(SUM(total_sale),0) sales, COALESCE(SUM(total_return),0) returns,
                COALESCE(SUM(cash_in_hand),0) opening, COALESCE(SUM(cash_in_hand_while_closing),0) closing')->first();
        $cur = $agg($p['start'], $p['end']);
        $prev = $agg($p['prev_start'], $p['prev_end']);
        [$days, $sales] = $this->daily($base, 'created_at', 'SUM(total_sale)', $p);
        [, $closing] = $this->daily($base, 'created_at', 'SUM(cash_in_hand_while_closing)', $p);

        return $this->wrap($p, [
            $this->kpi('registers', 'report-summary.registers', $cur->cnt, $prev->cnt, 'number'),
            $this->kpi('sales', 'report-summary.total-sales', $cur->sales, $prev->sales),
            $this->kpi('returns', 'report-summary.sale-returns', $cur->returns, $prev->returns),
            $this->kpi('opening', 'report-summary.cash-opening', $cur->opening, $prev->opening),
            $this->kpi('closing', 'report-summary.cash-closing', $cur->closing, $prev->closing),
        ], [
            ['type' => 'bar', 'title_key' => 'report-summary.chart.register-daily', 'categories' => $days,
                'series' => [
                    ['name_key' => 'report-summary.total-sales', 'data' => $sales],
                    ['name_key' => 'report-summary.cash-closing', 'data' => $closing],
                ], 'format' => 'currency', 'span' => 3],
        ]);
    }

    public function stockAlerts(Request $request): array
    {
        $wh = $this->warehouseId($request);
        $base = DB::table('manage_stocks')->join('products', 'products.id', '=', 'manage_stocks.product_id')
            ->when($wh, fn ($q) => $q->where('manage_stocks.warehouse_id', $wh))
            ->whereRaw('manage_stocks.quantity <= COALESCE(products.stock_alert,0)');
        $agg = (clone $base)->selectRaw('COUNT(*) items, SUM(CASE WHEN manage_stocks.quantity <= 0 THEN 1 ELSE 0 END) out_cnt,
            COUNT(DISTINCT manage_stocks.warehouse_id) whs,
            COALESCE(SUM(GREATEST(COALESCE(products.stock_alert,0) - manage_stocks.quantity, 0)),0) shortfall')->first();
        $lowest = (clone $base)->selectRaw('products.name n, manage_stocks.quantity q, products.stock_alert a')
            ->orderByRaw('(manage_stocks.quantity - COALESCE(products.stock_alert,0)) asc')->limit(10)->get();

        return $this->wrap(null, [
            $this->kpi('items', 'report-summary.alert-items', $agg->items, null, 'number'),
            $this->kpi('out', 'report-summary.out-of-stock', $agg->out_cnt, null, 'number'),
            $this->kpi('shortfall', 'report-summary.units-to-reorder', $agg->shortfall, null, 'number'),
            $this->kpi('warehouses', 'report-summary.warehouses-affected', $agg->whs, null, 'number'),
        ], [
            ['type' => 'bar', 'title_key' => 'report-summary.chart.lowest-stock', 'horizontal' => true, 'categories' => $lowest->pluck('n'),
                'series' => [
                    ['name_key' => 'report-summary.in-stock', 'data' => $lowest->pluck('q')->map(fn ($v) => round($v, 2))],
                    ['name_key' => 'report-summary.alert-level', 'data' => $lowest->pluck('a')->map(fn ($v) => round((float) $v, 2))],
                ], 'format' => 'number', 'span' => 3, 'colors' => ['#F62947', '#9AA6CA']],
        ]);
    }

    // ------------------------------------------------------------------- HRM

    protected function employeeScope(Request $request)
    {
        $q = DB::table('employees')->where('employees.status', 'active');
        if ($wh = $this->warehouseId($request)) {
            $q->where('employees.warehouse_id', $wh);
        }
        if (($dept = $request->get('department_id')) && (int) $dept > 0) {
            $q->where('employees.department_id', (int) $dept);
        }

        return $q;
    }

    public function attendance(Request $request): array
    {
        $today = Carbon::parse(HrSetting::today());
        $month = $request->get('month');
        try {
            $monthStart = $month ? Carbon::parse($month.'-01')->startOfMonth() : $today->copy()->startOfMonth();
        } catch (\Throwable $e) {
            $monthStart = $today->copy()->startOfMonth();
        }
        $monthEnd = $monthStart->copy()->endOfMonth();
        if ($monthEnd->gt($today) && $monthStart->lte($today)) {
            $monthEnd = $today->copy();
        }
        $p = ['start' => $monthStart->toDateString(), 'end' => $monthEnd->toDateString(), 'is_default' => ! $month];
        $prevStart = $monthStart->copy()->subMonthNoOverflow()->startOfMonth();
        $prevEnd = $prevStart->copy()->addDays($monthStart->diffInDays($monthEnd));

        $empIds = $this->employeeScope($request)->pluck('id');
        $att = fn () => DB::table('attendances')->whereIn('employee_id', $empIds);
        $counts = fn ($from, $to) => $att()->whereBetween('date', [$from, $to])
            ->selectRaw("SUM(status='present') present, SUM(status='late') late, SUM(status='half_day') half,
                SUM(status='absent') absent, SUM(status='leave') lv, COALESCE(SUM(ot_minutes),0) ot")->first();
        $cur = $counts($p['start'], $p['end']);
        $prev = $counts($prevStart->toDateString(), $prevEnd->toDateString());
        $marked = ($cur->present + $cur->late + $cur->half + $cur->absent);
        $prevMarked = ($prev->present + $prev->late + $prev->half + $prev->absent);

        $rows = $att()->whereBetween('date', [$p['start'], $p['end']])
            ->selectRaw("date d, SUM(status IN ('present')) p, SUM(status='late') l, SUM(status='absent') a, SUM(status='leave') lv")
            ->groupBy('d')->get()->keyBy('d');
        $days = [];
        $series = ['p' => [], 'l' => [], 'a' => [], 'lv' => []];
        foreach (CarbonPeriod::create($p['start'], $p['end']) as $day) {
            $k = $day->toDateString();
            $days[] = $k;
            foreach ($series as $s => $_) {
                $series[$s][] = (int) ($rows[$k]->$s ?? 0);
            }
        }

        return $this->wrap($p, [
            $this->kpi('employees', 'report-summary.active-employees', $empIds->count(), null, 'number'),
            $this->kpi('attendance_rate', 'report-summary.attendance-rate',
                $marked ? ($cur->present + $cur->late + $cur->half) / $marked * 100 : 0,
                $prevMarked ? ($prev->present + $prev->late + $prev->half) / $prevMarked * 100 : 0, 'percent'),
            $this->kpi('late', 'report-summary.late-days', $cur->late, $prev->late, 'number'),
            $this->kpi('absent', 'report-summary.absent-days', $cur->absent, $prev->absent, 'number'),
            $this->kpi('leave', 'report-summary.leave-days', $cur->lv, $prev->lv, 'number'),
            $this->kpi('ot', 'report-summary.ot-hours', $cur->ot / 60, $prev->ot / 60, 'number'),
        ], [
            ['type' => 'bar', 'stacked' => true, 'title_key' => 'report-summary.chart.attendance-trend', 'categories' => $days,
                'series' => [
                    ['name_key' => 'report-summary.present', 'data' => $series['p']],
                    ['name_key' => 'report-summary.late', 'data' => $series['l']],
                    ['name_key' => 'report-summary.absent', 'data' => $series['a']],
                    ['name_key' => 'report-summary.on-leave', 'data' => $series['lv']],
                ], 'format' => 'number', 'span' => 2, 'colors' => ['#0AC074', '#FFB821', '#F62947', '#0099FB']],
            ['type' => 'donut', 'title_key' => 'report-summary.chart.attendance-status',
                'labels_key' => ['report-summary.present', 'report-summary.late', 'report-summary.half-day', 'report-summary.absent', 'report-summary.on-leave'],
                'series' => [(int) $cur->present, (int) $cur->late, (int) $cur->half, (int) $cur->absent, (int) $cur->lv],
                'format' => 'number', 'colors' => ['#0AC074', '#FFB821', '#6275AD', '#F62947', '#0099FB']],
        ]);
    }

    public function leave(Request $request): array
    {
        $year = (int) ($request->get('year') ?: Carbon::parse(HrSetting::today())->year);
        $empIds = $this->employeeScope($request)->pluck('id');
        $types = DB::table('leave_types')->orderBy('id')->get(['id', 'name']);
        $entitled = DB::table('leave_entitlements')->whereIn('employee_id', $empIds)->where('year', $year)
            ->selectRaw('leave_type_id t, SUM(days) d')->groupBy('t')->pluck('d', 't');
        $req = fn ($status) => DB::table('leave_requests')->whereIn('employee_id', $empIds)->where('status', $status)
            ->whereYear('from_date', $year)->selectRaw('leave_type_id t, SUM(days) d')->groupBy('t')->pluck('d', 't');
        $used = $req('approved');
        $pending = $req('pending');
        $names = [];
        $usedData = [];
        $balanceData = [];
        foreach ($types as $type) {
            $names[] = $type->name;
            $usedData[] = round((float) ($used[$type->id] ?? 0), 1);
            $balanceData[] = round(max(0, (float) ($entitled[$type->id] ?? 0) - (float) ($used[$type->id] ?? 0)), 1);
        }

        return $this->wrap(['start' => $year.'-01-01', 'end' => $year.'-12-31', 'is_default' => ! $request->get('year')], [
            $this->kpi('entitled', 'report-summary.leave-entitled', $entitled->sum(), null, 'number'),
            $this->kpi('used', 'report-summary.leave-used', $used->sum(), null, 'number'),
            $this->kpi('pending', 'report-summary.leave-pending', $pending->sum(), null, 'number'),
            $this->kpi('balance', 'report-summary.leave-balance', max(0, $entitled->sum() - $used->sum()), null, 'number'),
        ], [
            ['type' => 'bar', 'stacked' => true, 'title_key' => 'report-summary.chart.leave-by-type', 'categories' => $names,
                'series' => [
                    ['name_key' => 'report-summary.leave-used', 'data' => $usedData],
                    ['name_key' => 'report-summary.leave-balance', 'data' => $balanceData],
                ], 'format' => 'number', 'span' => 3, 'colors' => ['#F62947', '#0AC074']],
        ]);
    }

    public function payroll(Request $request): array
    {
        $month = $request->get('month');
        try {
            $end = $month ? Carbon::parse($month.'-01') : Carbon::parse(HrSetting::today());
        } catch (\Throwable $e) {
            $end = Carbon::parse(HrSetting::today());
        }
        $months = $this->months($end, 6);
        $wh = $this->warehouseId($request);
        $rows = DB::table('payslips')->join('payroll_runs', 'payroll_runs.id', '=', 'payslips.payroll_run_id')
            ->whereIn('payroll_runs.status', ['approved', 'paid'])
            ->when($wh, fn ($q) => $q->join('employees', 'employees.id', '=', 'payslips.employee_id')->where('employees.warehouse_id', $wh))
            ->whereBetween('payroll_runs.month', [$months[0].'-01', end($months).'-01'])
            ->selectRaw("DATE_FORMAT(payroll_runs.month, '%Y-%m') m, SUM(payslips.gross_earnings) gross, SUM(payslips.net_pay) net,
                SUM(payslips.epf_employee + payslips.epf_employer) epf, SUM(payslips.etf) etf, COUNT(*) staff")
            ->groupBy('m')->get()->keyBy('m');
        $pick = fn ($m, $f) => round((float) ($rows[$m]->$f ?? 0), 2);
        $last = end($months);
        $prev = $months[count($months) - 2];
        // latest month that actually has a run, so the cards aren't empty mid-month
        $latest = collect($months)->reverse()->first(fn ($m) => isset($rows[$m])) ?? $last;
        $latestIdx = array_search($latest, $months);
        $before = $latestIdx > 0 ? $months[$latestIdx - 1] : $prev;

        return $this->wrap(['start' => $latest.'-01', 'end' => Carbon::parse($latest.'-01')->endOfMonth()->toDateString(), 'is_default' => ! $month], [
            $this->kpi('net', 'report-summary.net-pay', $pick($latest, 'net'), $pick($before, 'net')),
            $this->kpi('gross', 'report-summary.gross-pay', $pick($latest, 'gross'), $pick($before, 'gross')),
            $this->kpi('epf', 'report-summary.epf-total', $pick($latest, 'epf'), $pick($before, 'epf')),
            $this->kpi('etf', 'report-summary.etf-total', $pick($latest, 'etf'), $pick($before, 'etf')),
            $this->kpi('staff', 'report-summary.employees-paid', $pick($latest, 'staff'), $pick($before, 'staff'), 'number'),
        ], [
            ['type' => 'bar', 'title_key' => 'report-summary.chart.payroll-6-months', 'categories' => $months,
                'series' => [
                    ['name_key' => 'report-summary.gross-pay', 'data' => array_map(fn ($m) => $pick($m, 'gross'), $months)],
                    ['name_key' => 'report-summary.net-pay', 'data' => array_map(fn ($m) => $pick($m, 'net'), $months)],
                    ['name_key' => 'report-summary.epf-total', 'data' => array_map(fn ($m) => $pick($m, 'epf'), $months)],
                    ['name_key' => 'report-summary.etf-total', 'data' => array_map(fn ($m) => $pick($m, 'etf'), $months)],
                ], 'format' => 'currency', 'span' => 3],
        ]);
    }
}
