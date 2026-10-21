<?php

namespace App\Http\Controllers\API;

use App\Exports\ExpenseWarehouseReportExport;
use App\Exports\ProductPurchaseReportExport;
use App\Exports\ProductPurchaseReturnReportExport;
use App\Exports\ProductSaleReportExport;
use App\Exports\ProductSaleReturnReportExport;
use App\Exports\PurchaseReportExport;
use App\Exports\PurchaseReturnWarehouseReportExport;
use App\Exports\PurchasesWarehouseReportExport;
use App\Exports\SaleReportExport;
use App\Exports\SaleReturnWarehouseReportExport;
use App\Exports\SalesWarehouseReportExport;
use App\Exports\StockReportExport;
use App\Exports\TopSellingProductReportExport;
use App\Http\Controllers\AppBaseController;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseReturn;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\Supplier;
use App\Models\Warehouse;
use App\Services\ReportPdfService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * PDF versions of the Excel-only reports. Each report reads its data from the matching
 * Excel export's own query (export->view()->getData()) so filters and records always
 * match the Excel file; only the presentation is built here.
 */
class ReportPdfAPIController extends AppBaseController
{
    private ReportPdfService $pdf;

    public function __construct(ReportPdfService $pdf)
    {
        $this->pdf = $pdf;
    }

    // ---------- warehouse report tabs ----------

    public function warehouseSales(Request $request): JsonResponse
    {
        $sales = (new SalesWarehouseReportExport)->view()->getData()['sales'];
        $rows = [];
        $sum = ['total' => 0, 'paid' => 0, 'due' => 0];
        foreach ($sales as $sale) {
            $paid = (float) $sale->payments->sum('amount');
            $due = max((float) $sale->grand_total - $paid, 0);
            $rows[] = [$sale->reference_code, $this->date($sale->date), optional($sale->customer)->name,
                optional($sale->warehouse)->name, $this->m($sale->grand_total), $this->m($paid), $this->m($due),
                $this->salePaymentStatus($sale->payment_status)];
            $sum['total'] += $sale->grand_total;
            $sum['paid'] += $paid;
            $sum['due'] += $due;
        }

        return $this->send('sales_pdf_url', $this->pdf->table([
            'title' => 'SALES REPORT',
            'meta' => $this->meta($request, ['Warehouse' => $this->warehouseName($request)]),
            'columns' => $this->cols(['Reference', 'Date', 'Customer', 'Warehouse', 'Total#', 'Paid#', 'Due#', 'Payment status']),
            'rows' => $rows,
            'foot' => ['Total', count($rows).' sales', '', '', $this->m($sum['total']), $this->m($sum['paid']), $this->m($sum['due']), ''],
            'empty' => 'No sales found',
        ], 'warehouse-sales-report.pdf'));
    }

    public function warehousePurchases(Request $request): JsonResponse
    {
        $purchases = (new PurchasesWarehouseReportExport)->view()->getData()['purchases'];
        $rows = [];
        $sum = ['total' => 0, 'paid' => 0];
        foreach ($purchases as $purchase) {
            $rows[] = [$purchase->reference_code, $this->date($purchase->date), optional($purchase->supplier)->name,
                optional($purchase->warehouse)->name, $this->m($purchase->grand_total), $this->m($purchase->paid_amount),
                $this->purchaseStatus($purchase->status)];
            $sum['total'] += $purchase->grand_total;
            $sum['paid'] += (float) $purchase->paid_amount;
        }
        $filters = $this->supplierName($request)
            ? ['Supplier' => $this->supplierName($request)]
            : ['Warehouse' => $this->warehouseName($request)];

        return $this->send('purchase_pdf_url', $this->pdf->table([
            'title' => 'PURCHASES REPORT',
            'meta' => $this->meta($request, $filters),
            'columns' => $this->cols(['Reference', 'Date', 'Supplier', 'Warehouse', 'Total#', 'Paid#', 'Status']),
            'rows' => $rows,
            'foot' => ['Total', count($rows).' purchases', '', '', $this->m($sum['total']), $this->m($sum['paid']), ''],
            'empty' => 'No purchases found',
        ], 'purchases-report-'.($request->get('supplier_id') ? 'supplier' : 'warehouse').'.pdf'));
    }

    public function warehouseSaleReturns(Request $request): JsonResponse
    {
        $saleReturns = (new SaleReturnWarehouseReportExport)->view()->getData()['saleReturns'];
        $rows = [];
        $sum = ['total' => 0, 'paid' => 0, 'due' => 0];
        foreach ($saleReturns as $return) {
            $paid = (float) $return->paid_amount;
            $due = max((float) $return->grand_total - $paid, 0);
            $rows[] = [$return->reference_code, $this->date($return->date), optional($return->customer)->name,
                optional($return->warehouse)->name, $this->m($return->grand_total), $this->m($paid), $this->m($due),
                $return->status == SaleReturn::RECEIVED ? 'Received' : 'Pending'];
            $sum['total'] += $return->grand_total;
            $sum['paid'] += $paid;
            $sum['due'] += $due;
        }

        return $this->send('sale_return_pdf_url', $this->pdf->table([
            'title' => 'SALES RETURN REPORT',
            'meta' => $this->meta($request, ['Warehouse' => $this->warehouseName($request)]),
            'columns' => $this->cols(['Reference', 'Date', 'Customer', 'Warehouse', 'Total#', 'Paid#', 'Due#', 'Status']),
            'rows' => $rows,
            'foot' => ['Total', count($rows).' returns', '', '', $this->m($sum['total']), $this->m($sum['paid']), $this->m($sum['due']), ''],
            'empty' => 'No sale returns found',
        ], 'warehouse-sale-returns-report.pdf'));
    }

    public function warehousePurchaseReturns(Request $request): JsonResponse
    {
        $purchaseReturns = (new PurchaseReturnWarehouseReportExport)->view()->getData()['purchaseReturns'];
        $rows = [];
        $sum = ['total' => 0, 'paid' => 0, 'due' => 0];
        foreach ($purchaseReturns as $return) {
            $paid = (float) $return->paid_amount;
            $due = max((float) $return->grand_total - $paid, 0);
            $rows[] = [$return->reference_code, $this->date($return->date), optional($return->supplier)->name,
                optional($return->warehouse)->name, $this->m($return->grand_total), $this->m($paid), $this->m($due),
                $return->payment_status == PurchaseReturn::PAID ? 'Paid' : 'Unpaid'];
            $sum['total'] += $return->grand_total;
            $sum['paid'] += $paid;
            $sum['due'] += $due;
        }
        $filters = $this->supplierName($request)
            ? ['Supplier' => $this->supplierName($request)]
            : ['Warehouse' => $this->warehouseName($request)];

        return $this->send('purchase_return_pdf_url', $this->pdf->table([
            'title' => 'PURCHASE RETURN REPORT',
            'meta' => $this->meta($request, $filters),
            'columns' => $this->cols(['Reference', 'Date', 'Supplier', 'Warehouse', 'Total#', 'Paid#', 'Due#', 'Payment status']),
            'rows' => $rows,
            'foot' => ['Total', count($rows).' returns', '', '', $this->m($sum['total']), $this->m($sum['paid']), $this->m($sum['due']), ''],
            'empty' => 'No purchase returns found',
        ], 'purchase-returns-report-'.($request->get('supplier_id') ? 'supplier' : 'warehouse').'.pdf'));
    }

    public function warehouseExpenses(Request $request): JsonResponse
    {
        $expenses = (new ExpenseWarehouseReportExport)->view()->getData()['expenses'];
        $rows = [];
        $sum = 0;
        foreach ($expenses as $expense) {
            $rows[] = [$this->date($expense->date), $expense->reference_code, optional($expense->expenseCategory)->name,
                optional($expense->warehouse)->name, $this->m($expense->amount)];
            $sum += (float) $expense->amount;
        }

        return $this->send('expense_pdf_url', $this->pdf->table([
            'title' => 'EXPENSE REPORT',
            'meta' => $this->meta($request, ['Warehouse' => $this->warehouseName($request)]),
            'columns' => $this->cols(['Date', 'Reference', 'Category', 'Warehouse', 'Amount#']),
            'rows' => $rows,
            'foot' => ['Total', count($rows).' expenses', '', '', $this->m($sum)],
            'empty' => 'No expenses found',
        ], 'warehouse-expense-report.pdf'));
    }

    // ---------- sale / purchase / top selling / stock reports ----------

    public function totalSales(Request $request): JsonResponse
    {
        $sales = (new SaleReportExport)->view()->getData()['sales'];
        $rows = [];
        $sum = ['total' => 0, 'received' => 0];
        foreach ($sales as $sale) {
            $received = (float) $sale->payments->sum('amount');
            $rows[] = [$sale->reference_code, $this->date($sale->date), optional($sale->customer)->name,
                optional($sale->warehouse)->name, $this->saleStatus($sale->status), $this->m($sale->grand_total),
                $this->m($received), $this->salePaymentStatus($sale->payment_status)];
            $sum['total'] += $sale->grand_total;
            $sum['received'] += $received;
        }

        return $this->send('total_sale_pdf_url', $this->pdf->table([
            'title' => 'SALE REPORT',
            'meta' => $this->meta($request, ['Period' => $this->period($request)]),
            'columns' => $this->cols(['Reference', 'Date', 'Customer', 'Warehouse', 'Status', 'Total#', 'Received#', 'Payment status']),
            'rows' => $rows,
            'foot' => ['Total', count($rows).' sales', '', '', '', $this->m($sum['total']), $this->m($sum['received']), ''],
            'empty' => 'No sales found',
        ], 'total-sales-report.pdf'));
    }

    public function totalPurchases(Request $request): JsonResponse
    {
        $purchases = (new PurchaseReportExport)->view()->getData()['purchases'];
        $rows = [];
        $sum = ['total' => 0, 'paid' => 0];
        foreach ($purchases as $purchase) {
            $rows[] = [$purchase->reference_code, $this->date($purchase->date), optional($purchase->supplier)->name,
                optional($purchase->warehouse)->name, $this->purchaseStatus($purchase->status),
                $this->m($purchase->grand_total), $this->m($purchase->paid_amount)];
            $sum['total'] += $purchase->grand_total;
            $sum['paid'] += (float) $purchase->paid_amount;
        }

        return $this->send('total_purchase_pdf_url', $this->pdf->table([
            'title' => 'PURCHASE REPORT',
            'meta' => $this->meta($request, ['Period' => $this->period($request)]),
            'columns' => $this->cols(['Reference', 'Date', 'Supplier', 'Warehouse', 'Status', 'Total#', 'Paid#']),
            'rows' => $rows,
            'foot' => ['Total', count($rows).' purchases', '', '', '', $this->m($sum['total']), $this->m($sum['paid'])],
            'empty' => 'No purchases found',
        ], 'total-purchases-report.pdf'));
    }

    public function topSelling(Request $request): JsonResponse
    {
        $products = (new TopSellingProductReportExport)->view()->getData()['topSellingProducts'];
        $rows = [];
        $sum = ['qty' => 0, 'total' => 0];
        foreach ($products as $product) {
            $rows[] = [$product['code'], $product['name'], $this->m($product['price']), $product['total_quantity'],
                $this->m($product['grand_total'])];
            $sum['qty'] += (float) $product['total_quantity'];
            $sum['total'] += (float) $product['grand_total'];
        }

        return $this->send('top_selling_product_pdf_url', $this->pdf->table([
            'title' => 'TOP SELLING PRODUCTS',
            'meta' => $this->meta($request, ['Period' => $this->period($request)]),
            'columns' => $this->cols(['Code', 'Product', 'Price#', 'Quantity#', 'Total amount#']),
            'rows' => $rows,
            'foot' => ['Total', count($rows).' products', '', $this->qty($sum['qty']), $this->m($sum['total'])],
            'empty' => 'No sales in this period',
        ], 'top-selling-products-report.pdf'));
    }

    public function stock(Request $request): JsonResponse
    {
        $stocks = (new StockReportExport)->view()->getData()['stocks'];
        $rows = [];
        $sum = ['qty' => 0, 'cost' => 0];
        foreach ($stocks as $stock) {
            $product = $stock->product;
            $rows[] = [optional($product)->code, optional($product)->name, $this->m(optional($product)->product_cost),
                $this->m(optional($product)->product_price), $this->qty($stock->quantity),
                $this->m((float) $stock->quantity * (float) optional($product)->product_cost)];
            $sum['qty'] += (float) $stock->quantity;
            $sum['cost'] += (float) $stock->quantity * (float) optional($product)->product_cost;
        }

        return $this->send('stock_report_pdf_url', $this->pdf->table([
            'title' => 'STOCK REPORT',
            'meta' => $this->meta($request, ['Warehouse' => $this->warehouseName($request)]),
            'columns' => $this->cols(['Code', 'Product', 'Cost#', 'Price#', 'Current stock#', 'Stock value (cost)#']),
            'rows' => $rows,
            'foot' => ['Total', count($rows).' products', '', '', $this->qty($sum['qty']), $this->m($sum['cost'])],
            'empty' => 'No stock in this warehouse',
        ], 'stock-report.pdf'));
    }

    // ---------- product detail tabs (stock report → product) ----------

    public function productSales(Request $request): JsonResponse
    {
        $data = (new ProductSaleReportExport)->view()->getData();
        $productId = $data['productId'];
        $rows = [];
        $sum = ['qty' => 0, 'total' => 0];
        foreach ($data['sales'] as $sale) {
            $item = $sale->saleItems->firstWhere('product_id', $productId);
            $rows[] = [$sale->reference_code, $this->date($sale->date), optional($sale->customer)->name,
                optional($sale->warehouse)->name, $this->qty(optional($item)->quantity), $this->m(optional($item)->sub_total)];
            $sum['qty'] += (float) optional($item)->quantity;
            $sum['total'] += (float) optional($item)->sub_total;
        }

        return $this->productReport('PRODUCT SALES', $productId, $rows, $sum,
            ['Reference', 'Date', 'Customer', 'Warehouse', 'Quantity#', 'Sub total#'], 'product_sale_report_pdf_url', 'product-sales');
    }

    public function productPurchases(Request $request): JsonResponse
    {
        $data = (new ProductPurchaseReportExport)->view()->getData();
        $productId = $data['productId'];
        $rows = [];
        $sum = ['qty' => 0, 'total' => 0];
        foreach ($data['purchases'] as $purchase) {
            $item = $purchase->purchaseItems->firstWhere('product_id', $productId);
            $rows[] = [$purchase->reference_code, $this->date($purchase->date), optional($purchase->supplier)->name,
                optional($purchase->warehouse)->name, $this->qty(optional($item)->quantity), $this->m(optional($item)->sub_total)];
            $sum['qty'] += (float) optional($item)->quantity;
            $sum['total'] += (float) optional($item)->sub_total;
        }

        return $this->productReport('PRODUCT PURCHASES', $productId, $rows, $sum,
            ['Reference', 'Date', 'Supplier', 'Warehouse', 'Quantity#', 'Sub total#'], 'product_purchase_report_pdf_url', 'product-purchases');
    }

    public function productSaleReturns(Request $request): JsonResponse
    {
        $data = (new ProductSaleReturnReportExport)->view()->getData();
        $productId = $data['productId'];
        $rows = [];
        $sum = ['qty' => 0, 'total' => 0];
        foreach ($data['saleReturns'] as $return) {
            $item = $return->saleReturnItems->firstWhere('product_id', $productId);
            $rows[] = [$return->reference_code, $this->date($return->date), optional($return->customer)->name,
                optional($return->warehouse)->name, $this->qty(optional($item)->quantity), $this->m(optional($item)->sub_total)];
            $sum['qty'] += (float) optional($item)->quantity;
            $sum['total'] += (float) optional($item)->sub_total;
        }

        return $this->productReport('PRODUCT SALE RETURNS', $productId, $rows, $sum,
            ['Reference', 'Date', 'Customer', 'Warehouse', 'Quantity#', 'Sub total#'], 'product_sale_return_report_pdf_url', 'product-sale-returns');
    }

    public function productPurchaseReturns(Request $request): JsonResponse
    {
        $data = (new ProductPurchaseReturnReportExport)->view()->getData();
        $productId = $data['productId'];
        $rows = [];
        $sum = ['qty' => 0, 'total' => 0];
        foreach ($data['purchaseReturns'] as $return) {
            $item = $return->purchaseReturnItems->firstWhere('product_id', $productId);
            $rows[] = [$return->reference_code, $this->date($return->date), optional($return->supplier)->name,
                optional($return->warehouse)->name, $this->qty(optional($item)->quantity), $this->m(optional($item)->sub_total)];
            $sum['qty'] += (float) optional($item)->quantity;
            $sum['total'] += (float) optional($item)->sub_total;
        }

        return $this->productReport('PRODUCT PURCHASE RETURNS', $productId, $rows, $sum,
            ['Reference', 'Date', 'Supplier', 'Warehouse', 'Quantity#', 'Sub total#'], 'product_purchase_return_report_pdf_url', 'product-purchase-returns');
    }

    // ---------- helpers ----------

    private function productReport(string $title, $productId, array $rows, array $sum, array $columns, string $key, string $file): JsonResponse
    {
        $product = Product::find($productId);
        $label = $product ? $product->name.' ('.$product->code.')' : '—';

        return $this->send($key, $this->pdf->table([
            'title' => $title,
            'meta' => ['Product' => $label, 'Records' => count($rows)],
            'columns' => $this->cols($columns),
            'rows' => $rows,
            'foot' => ['Total', count($rows).' records', '', '', $this->qty($sum['qty']), $this->m($sum['total'])],
            'empty' => 'No records for this product',
        ], $file.'-'.$productId.'.pdf'));
    }

    /** "Label#" marks a numeric (right-aligned) column. */
    private function cols(array $labels): array
    {
        return array_map(fn ($label) => str_ends_with($label, '#')
            ? ['label' => substr($label, 0, -1), 'num' => true]
            : ['label' => $label], $labels);
    }

    private function meta(Request $request, array $filters): array
    {
        return array_filter($filters, fn ($v) => $v !== null && $v !== '');
    }

    private function send(string $key, string $url): JsonResponse
    {
        return $this->sendResponse([$key => $url], 'PDF created successfully');
    }

    private function m($value): string
    {
        return $this->pdf->money($value);
    }

    private function qty($value): string
    {
        $value = (float) $value;

        return fmod($value, 1.0) == 0.0 ? number_format($value) : number_format($value, 2);
    }

    private function date($value): string
    {
        try {
            return $value ? Carbon::parse($value)->format('d M Y') : '';
        } catch (\Throwable $e) {
            return (string) $value;
        }
    }

    private function filled(Request $request, string $key): ?string
    {
        $value = $request->get($key);

        return ($value === null || $value === '' || $value === 'null') ? null : (string) $value;
    }

    private function warehouseName(Request $request): string
    {
        $id = $this->filled($request, 'warehouse_id');

        return $id ? (optional(Warehouse::find($id))->name ?? '—') : 'All warehouses';
    }

    private function supplierName(Request $request): ?string
    {
        $id = $this->filled($request, 'supplier_id');

        return $id ? (optional(Supplier::find($id))->name ?? '—') : null;
    }

    private function period(Request $request): string
    {
        $from = $this->filled($request, 'start_date');
        $to = $this->filled($request, 'end_date');
        if (! $from && ! $to) {
            return 'All dates';
        }

        return $this->date($from).' – '.$this->date($to ?: $from);
    }

    private function saleStatus($status): string
    {
        return [Sale::COMPLETED => 'Completed', Sale::PENDING => 'Pending', Sale::ORDERED => 'Ordered'][$status] ?? '';
    }

    private function salePaymentStatus($status): string
    {
        return [Sale::PAID => 'Paid', Sale::UNPAID => 'Unpaid', Sale::PARTIAL_PAID => 'Partial'][$status] ?? '';
    }

    private function purchaseStatus($status): string
    {
        return [Purchase::RECEIVED => 'Received', Purchase::PENDING => 'Pending', Purchase::ORDERED => 'Ordered'][$status] ?? '';
    }
}
