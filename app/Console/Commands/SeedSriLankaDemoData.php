<?php

namespace App\Console\Commands;

use App\Models\BaseUnit;
use App\Models\Brand;
use App\Models\Currency;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\MainProduct;
use App\Models\ManageStock;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Sale;
use App\Models\SalesPayment;
use App\Models\Setting;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Repositories\ProductRepository;
use App\Repositories\PurchaseRepository;
use App\Repositories\SaleRepository;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SeedSriLankaDemoData extends Command
{
    protected $signature = 'demo:seed-sri-lanka';

    protected $description = 'Seed realistic Sri Lankan sample data (products, customers, suppliers, sales, purchases, expenses) for dashboard previewing';

    private array $stock = [];

    public function handle(): int
    {
        $admin = User::first();
        if (! $admin) {
            $this->error('No admin user found.');

            return self::FAILURE;
        }
        Auth::login($admin);

        $this->info('Setting LKR currency...');
        $this->setupCurrency();

        $this->info('Updating default warehouse/customer to Sri Lankan context...');
        $this->updateDefaults();

        $this->info('Creating categories, brands, units...');
        $categories = $this->createCategories();
        $brands = $this->createBrands();
        [$pieceUnit, $kgUnit] = $this->createUnits();

        $this->info('Creating customers & suppliers...');
        $customers = $this->createCustomers();
        $suppliers = $this->createSuppliers();

        $this->info('Creating products...');
        $products = $this->createProducts($categories, $brands, $pieceUnit, $kgUnit);

        $this->info('Creating expense categories...');
        $expenseCategories = $this->createExpenseCategories();

        $warehouse = Warehouse::first();

        $this->info('Simulating 30 days of purchases, sales & expenses...');
        $this->simulate($products, $customers, $suppliers, $warehouse, $expenseCategories);

        $this->info('Done.');

        return self::SUCCESS;
    }

    private function setupCurrency(): void
    {
        $lkr = Currency::firstOrCreate(
            ['code' => 'LKR'],
            ['name' => 'Sri Lanka', 'symbol' => 'Rs.']
        );
        Setting::updateOrCreate(['key' => 'currency'], ['value' => $lkr->id]);
    }

    private function updateDefaults(): void
    {
        Warehouse::whereId(1)->update([
            'name' => 'Main Warehouse - Colombo',
            'phone' => '0112345678',
            'country' => 'Sri Lanka',
            'city' => 'Colombo',
            'zip_code' => '00100',
        ]);

        Customer::whereId(1)->update([
            'country' => 'Sri Lanka',
            'city' => 'Colombo',
            'address' => 'No. 10, Galle Road, Colombo 03',
        ]);
    }

    private function createCategories(): array
    {
        $names = ['Groceries', 'Beverages', 'Electronics & Accessories', 'Stationery & Office', 'Personal Care'];
        $categories = [];
        foreach ($names as $name) {
            $categories[] = ProductCategory::firstOrCreate(['name' => $name]);
        }

        return $categories;
    }

    private function createBrands(): array
    {
        $names = ['Local Fresh', 'CeyTech', 'HomeEssentials'];
        $brands = [];
        foreach ($names as $name) {
            $brands[] = Brand::firstOrCreate(['name' => $name]);
        }

        return $brands;
    }

    private function createUnits(): array
    {
        $pieceBase = BaseUnit::where('name', 'piece')->first();
        $kgBase = BaseUnit::where('name', 'kilogram')->first();

        $pieceUnit = Unit::firstOrCreate(
            ['name' => 'Pieces'],
            ['short_name' => 'Pcs', 'base_unit' => $pieceBase->id]
        );
        $kgUnit = Unit::firstOrCreate(
            ['name' => 'Kilogram'],
            ['short_name' => 'Kg', 'base_unit' => $kgBase->id]
        );

        return [$pieceUnit, $kgUnit];
    }

    private function createCustomers(): array
    {
        $data = [
            ['Nimal Perera', 'Colombo'], ['Kamala Silva', 'Kandy'], ['Sunil Fernando', 'Galle'],
            ['Priyanka Jayawardena', 'Negombo'], ['Ruwan Bandara', 'Kurunegala'], ['Dilani Rathnayake', 'Matara'],
            ['Chamara Wickramasinghe', 'Jaffna'], ['Tharindu Gunasekara', 'Anuradhapura'],
        ];
        $customers = [];
        foreach ($data as $i => [$name, $city]) {
            $email = strtolower(str_replace(' ', '.', $name)) . $i . '@example.lk';
            $customers[] = Customer::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'phone' => '07' . rand(10000000, 99999999),
                    'country' => 'Sri Lanka',
                    'city' => $city,
                    'address' => 'No. ' . rand(1, 200) . ', Main Street, ' . $city,
                ]
            );
        }

        return $customers;
    }

    private function createSuppliers(): array
    {
        $data = [
            ['Colombo Wholesale Traders', 'Colombo'], ['Kandy Distributors (Pvt) Ltd', 'Kandy'],
            ['Southern Supplies Co.', 'Galle'], ['Western Province Imports', 'Negombo'],
            ['Central Trading House', 'Kurunegala'],
        ];
        $suppliers = [];
        foreach ($data as $i => [$name, $city]) {
            $email = 'supplier' . $i . '@' . strtolower(str_replace([' ', '(', ')', '.', ','], '', $name)) . '.lk';
            $suppliers[] = Supplier::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'phone' => '011' . rand(1000000, 9999999),
                    'country' => 'Sri Lanka',
                    'city' => $city,
                    'address' => 'No. ' . rand(1, 200) . ', Industrial Road, ' . $city,
                ]
            );
        }

        return $suppliers;
    }

    private function createExpenseCategories(): array
    {
        $names = ['Utilities', 'Rent', 'Staff Salaries'];
        $categories = [];
        foreach ($names as $name) {
            $categories[] = ExpenseCategory::firstOrCreate(['name' => $name]);
        }

        return $categories;
    }

    private function createProducts(array $categories, array $brands, Unit $pieceUnit, Unit $kgUnit): array
    {
        $catByName = $categories;
        [$groceries, $beverages, $electronics, $stationery, $personalCare] = $catByName;

        // name, category, cost, price, isWeightUnit, stockAlert
        $catalog = [
            ['Basmati Rice 5kg', $groceries, 1450, 1750, true, 15],
            ['Red Lentils (Parippu) 1kg', $groceries, 280, 340, true, 20],
            ['Full Cream Milk Powder 400g', $groceries, 780, 920, false, 15],
            ['Pure Coconut Oil 750ml', $groceries, 560, 680, false, 15],
            ['Wheat Flour 1kg', $groceries, 190, 230, true, 20],
            ['White Sugar 1kg', $groceries, 230, 270, true, 20],
            ['Chilli Powder 250g', $groceries, 310, 380, false, 15],
            ['Curry Powder 250g', $groceries, 340, 410, false, 15],
            ['Glucose Biscuits 200g', $groceries, 140, 180, false, 20],
            ['Instant Noodles Pack', $groceries, 90, 120, false, 25],
            ['Tea Leaves 200g', $beverages, 420, 500, false, 15],
            ['Instant Coffee 100g', $beverages, 650, 780, false, 15],
            ['Bottled Drinking Water 1.5L', $beverages, 70, 100, false, 30],
            ['Carbonated Soft Drink 1.5L', $beverages, 160, 210, false, 25],
            ['Fresh Fruit Juice 1L', $beverages, 310, 390, false, 15],
            ['Mobile Phone Charger (Type-C)', $electronics, 650, 950, false, 10],
            ['Wired Earphones', $electronics, 420, 650, false, 10],
            ['Power Bank 10000mAh', $electronics, 2800, 3600, false, 8],
            ['Bluetooth Speaker Mini', $electronics, 3200, 4200, false, 8],
            ['A4 Exercise Book 80pg', $stationery, 95, 130, false, 25],
            ['Ballpoint Pen (Blue) - Box', $stationery, 180, 240, false, 20],
            ['Permanent Marker', $stationery, 110, 150, false, 20],
            ['Bathing Soap 100g', $personalCare, 95, 130, false, 25],
            ['Dishwashing Liquid 500ml', $personalCare, 260, 330, false, 20],
            ['Toothpaste 120g', $personalCare, 280, 350, false, 20],
            ['Shampoo 180ml', $personalCare, 420, 540, false, 15],
            ['Hand Sanitizer 250ml', $personalCare, 310, 400, false, 15],
        ];

        $productRepo = app(ProductRepository::class);
        $products = [];
        $codeSeq = 1001;

        foreach ($catalog as $i => [$name, $category, $cost, $price, $isWeight, $stockAlert]) {
            $existing = Product::where('name', $name)->first();
            if ($existing) {
                $products[] = $existing;

                continue;
            }

            $brand = $brands[$i % count($brands)];
            $unit = $isWeight ? $kgUnit : $pieceUnit;
            $baseUnitId = $isWeight ? $kgUnit->base_unit : $pieceUnit->base_unit;

            $mainProduct = MainProduct::create([
                'name' => $name,
                'code' => 'MP-' . $codeSeq,
                'product_unit' => $baseUnitId,
                'product_type' => MainProduct::SINGLE_PRODUCT,
            ]);

            $input = [
                'name' => $name,
                'code' => 'PR-' . $codeSeq,
                'product_code' => 'PC-' . $codeSeq,
                'main_product_id' => $mainProduct->id,
                'product_category_id' => $category->id,
                'brand_id' => $brand->id,
                'product_cost' => $cost,
                'product_price' => $price,
                'product_unit' => $baseUnitId,
                'sale_unit' => $unit->id,
                'purchase_unit' => $unit->id,
                'stock_alert' => $stockAlert,
                'quantity_limit' => null,
                'order_tax' => 0,
                'tax_type' => null,
                'notes' => null,
                'barcode_symbol' => Product::CODE128,
            ];

            $product = $productRepo->storeProduct($input);
            $products[] = $product;
            $codeSeq++;
        }

        return $products;
    }

    private function simulate(array $products, array $customers, array $suppliers, Warehouse $warehouse, array $expenseCategories): void
    {
        $saleRepo = app(SaleRepository::class);
        $purchaseRepo = app(PurchaseRepository::class);

        foreach ($products as $product) {
            $this->stock[$product->id] = 0;
        }

        $days = 30;
        $start = Carbon::today()->subDays($days - 1);

        for ($d = 0; $d < $days; $d++) {
            $date = $start->copy()->addDays($d);
            $dateStr = $date->format('Y-m-d');

            // Purchases: 1-3 per day, replenishing stock
            $purchaseCount = rand(1, 3);
            for ($p = 0; $p < $purchaseCount; $p++) {
                $product = $products[array_rand($products)];
                $supplier = $suppliers[array_rand($suppliers)];
                $qty = rand(30, 90);

                $input = [
                    'supplier_id' => $supplier->id,
                    'warehouse_id' => $warehouse->id,
                    'date' => $dateStr,
                    'tax_rate' => 0,
                    'tax_amount' => 0,
                    'discount' => 0,
                    'shipping' => 0,
                    'grand_total' => 0,
                    'received_amount' => 0,
                    'paid_amount' => 0,
                    'payment_type' => 1,
                    'notes' => null,
                    'status' => 1,
                    'purchase_items' => [[
                        'product_id' => $product->id,
                        'product_cost' => $product->product_cost,
                        'tax_type' => 1,
                        'tax_value' => 0,
                        'discount_type' => 2,
                        'discount_value' => 0,
                        'purchase_unit' => $product->purchase_unit,
                        'quantity' => $qty,
                    ]],
                ];

                try {
                    $purchase = $purchaseRepo->storePurchase($input);
                    $timestamp = $date->copy()->addHours(rand(8, 17));
                    DB::table('purchases')->where('id', $purchase->id)->update([
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ]);
                    $this->stock[$product->id] += $qty;
                } catch (\Throwable $e) {
                    $this->warn('Purchase skipped: ' . $e->getMessage());
                }
            }

            // Sales: 3-8 per day
            $saleCount = rand(3, 8);
            for ($s = 0; $s < $saleCount; $s++) {
                $customer = $customers[array_rand($customers)];
                $itemCount = rand(1, 3);
                $saleItems = [];
                $usedProducts = [];

                for ($it = 0; $it < $itemCount; $it++) {
                    $product = $products[array_rand($products)];
                    if (in_array($product->id, $usedProducts, true)) {
                        continue;
                    }
                    $available = $this->stock[$product->id] ?? 0;
                    if ($available < 1) {
                        continue;
                    }
                    $qty = rand(1, min(5, $available));
                    $usedProducts[] = $product->id;
                    $this->stock[$product->id] -= $qty;

                    $saleItems[] = [
                        'product_id' => $product->id,
                        'product_price' => $product->product_price,
                        'tax_type' => 1,
                        'tax_value' => 0,
                        'discount_type' => 2,
                        'discount_value' => 0,
                        'sale_unit' => $product->sale_unit,
                        'quantity' => $qty,
                    ];
                }

                if (empty($saleItems)) {
                    continue;
                }

                $isPaid = rand(1, 10) > 2; // ~80% fully paid
                $subTotal = 0;
                foreach ($saleItems as $item) {
                    $subTotal += $item['product_price'] * $item['quantity'];
                }

                $input = [
                    'date' => $dateStr,
                    'customer_id' => $customer->id,
                    'warehouse_id' => $warehouse->id,
                    'tax_rate' => 0,
                    'tax_amount' => 0,
                    'discount' => 0,
                    'shipping' => 0,
                    'grand_total' => 0,
                    'received_amount' => $isPaid ? $subTotal : round($subTotal * 0.5, 2),
                    'paid_amount' => $isPaid ? $subTotal : round($subTotal * 0.5, 2),
                    'payment_type' => 1,
                    'note' => null,
                    'status' => 1,
                    'payment_status' => $isPaid ? Sale::PAID : Sale::PARTIAL_PAID,
                    'sale_items' => $saleItems,
                ];

                try {
                    $sale = $saleRepo->storeSale($input);
                    $createdAt = $date->copy()->addHours(rand(9, 19));
                    DB::table('sales')->where('id', $sale->id)->update([
                        'created_at' => $createdAt,
                        'updated_at' => $createdAt,
                    ]);

                    // SaleRepository::storeSale already creates a SalesPayment
                    // automatically when payment_status is PAID; only create one
                    // here for the PARTIAL_PAID case, which it does not handle.
                    if (! $isPaid) {
                        SalesPayment::create([
                            'sale_id' => $sale->id,
                            'payment_date' => $dateStr,
                            'payment_type' => 1,
                            'amount' => $sale->paid_amount,
                            'received_amount' => $sale->paid_amount,
                        ]);
                    } else {
                        DB::table('sales_payments')
                            ->where('sale_id', $sale->id)
                            ->update(['payment_date' => $dateStr]);
                    }
                } catch (\Throwable $e) {
                    $this->warn('Sale skipped: ' . $e->getMessage());
                }
            }

            // Expenses: 0-1 per day
            if (rand(0, 1) === 1) {
                $titles = ['Electricity bill', 'Water bill', 'Shop rent', 'Staff salary advance', 'Internet bill'];
                Expense::create([
                    'date' => $dateStr,
                    'warehouse_id' => $warehouse->id,
                    'expense_category_id' => $expenseCategories[array_rand($expenseCategories)]->id,
                    'amount' => rand(1500, 15000),
                    'title' => $titles[array_rand($titles)],
                ]);
            }
        }
    }
}
