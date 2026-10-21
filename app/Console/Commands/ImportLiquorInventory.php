<?php

namespace App\Console\Commands;

use App\Models\BaseUnit;
use App\Models\Brand;
use App\Models\MainProduct;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Unit;
use App\Models\Variation;
use App\Models\VariationProduct;
use App\Models\VariationType;
use App\Repositories\ProductRepository;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * One-off import of the liquor shop stock sheet (CSV columns:
 * category,brand,product,size,stock,price,opening_stock,sold,note).
 * Uses the same creation path as the product form (ProductRepository::storeProduct
 * + VariationProduct) and puts stock straight into manage_stocks.
 */
class ImportLiquorInventory extends Command
{
    protected $signature = 'inventory:import-liquor {csv} {--warehouse=}';

    protected $description = 'Import liquor shop inventory (products, size variations, prices, stock) from CSV';

    private const BEER_LIKE = ['Beer', 'Toddy'];

    public function handle(ProductRepository $productRepo): int
    {
        $path = $this->argument('csv');
        if (! is_file($path)) {
            $this->error("CSV not found: $path");

            return self::FAILURE;
        }

        $rows = $this->readCsv($path);
        $warehouseId = (int) ($this->option('warehouse') ?: getSettingValue('default_warehouse'));

        [$baseUnitId, $unitId] = $this->bottleUnit();
        $sizeVariation = Variation::firstOrCreate(['name' => 'Size']);

        $groups = [];
        foreach ($rows as $row) {
            $key = $row['category'].'|'.($row['brand'] ?: 'Other').'|'.$row['product'];
            $groups[$key][] = $row;
        }

        $seq = (int) (MainProduct::max('id') ?? 0);
        $created = ['main' => 0, 'variants' => 0];
        $failed = [];

        foreach ($groups as $key => $items) {
            [$categoryName, $brandName, $productName] = explode('|', $key, 3);
            $seq++;
            $mainCode = 'LQ'.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);

            try {
                DB::beginTransaction();

                $categoryId = ProductCategory::firstOrCreate(['name' => $categoryName])->id;
                $brandId = Brand::firstOrCreate(['name' => $brandName])->id;
                $hasSizes = collect($items)->contains(fn ($r) => $r['size'] !== '');
                $notes = collect($items)
                    ->filter(fn ($r) => str_contains($r['note'], 'CHECK'))
                    ->map(fn ($r) => trim(($r['size'] ? $r['size'].': ' : '').$r['note']))
                    ->implode(' | ');

                $mainProduct = MainProduct::create([
                    'name' => $productName,
                    'code' => $mainCode,
                    'product_unit' => $baseUnitId,
                    'product_type' => $hasSizes ? MainProduct::VARIATION_PRODUCT : MainProduct::SINGLE_PRODUCT,
                ]);

                foreach ($items as $item) {
                    $code = $hasSizes ? $mainCode.'-'.strtoupper($item['size']) : $mainCode;
                    $input = [
                        'name' => $productName,
                        'code' => $code,
                        'product_code' => $mainCode,
                        'main_product_id' => $mainProduct->id,
                        'product_category_id' => $categoryId,
                        'brand_id' => $brandId,
                        'product_cost' => 0,
                        'product_price' => (float) $item['price'],
                        'product_unit' => $baseUnitId,
                        'sale_unit' => $unitId,
                        'purchase_unit' => $unitId,
                        'stock_alert' => in_array($categoryName, self::BEER_LIKE, true) ? 24 : 5,
                        'order_tax' => 0,
                        'tax_type' => 1,
                        'notes' => $notes !== '' ? 'CHECK: '.$notes : null,
                        'barcode_symbol' => Product::CODE128,
                    ];

                    $product = $productRepo->storeProduct($input);

                    if ($hasSizes) {
                        $sizeType = VariationType::firstOrCreate([
                            'name' => $item['size'] ?: 'Standard',
                            'variation_id' => $sizeVariation->id,
                        ]);
                        VariationProduct::create([
                            'product_id' => $product->id,
                            'variation_id' => $sizeVariation->id,
                            'variation_type_id' => $sizeType->id,
                            'main_product_id' => $mainProduct->id,
                        ]);
                    }

                    manageStock($warehouseId, $product->id, (float) $item['stock']);
                    $created['variants']++;
                }

                DB::commit();
                $created['main']++;
            } catch (\Throwable $e) {
                DB::rollBack();
                $failed[] = "$key: ".$e->getMessage();
            }
        }

        $this->info("Main products: {$created['main']}, variants: {$created['variants']}, warehouse: $warehouseId");
        foreach ($failed as $line) {
            $this->error('FAILED '.$line);
        }

        return $failed ? self::FAILURE : self::SUCCESS;
    }

    private function readCsv(string $path): array
    {
        $handle = fopen($path, 'r');
        $header = array_map('trim', fgetcsv($handle));
        $rows = [];
        while (($line = fgetcsv($handle)) !== false) {
            if (count(array_filter($line, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }
            $row = array_combine($header, array_pad(array_map('trim', $line), count($header), ''));
            $rows[] = $row;
        }
        fclose($handle);

        return $rows;
    }

    private function bottleUnit(): array
    {
        $base = BaseUnit::firstOrCreate(['name' => 'bottle'], ['is_default' => 0]);
        $unit = Unit::firstOrCreate(['name' => 'Bottle'], ['short_name' => 'btl', 'base_unit' => $base->id]);

        return [$base->id, $unit->id];
    }
}
