<?php

use App\Models\Currency;
use App\Models\ManageStock;
use App\Models\Setting;
use App\Models\Supplier;
use Illuminate\Support\Facades\File;

if (! function_exists('getPageSize')) {
    /**
     * @return mixed
     */
    function getPageSize($request)
    {
        return $request->input('page.size', 10);
    }
}

function getLogoUrl(): string
{
    static $appLogo;

    if (empty($appLogo)) {
        $appLogo = Setting::where('key', '=', 'logo')->first();
    }

    return asset($appLogo->logo);
}

/**
 * Logo source for server-side image/PDF work: the local file when the logo is
 * stored on a local disk (fetching our own URL over HTTP deadlocks on the
 * single-threaded dev server and is slow elsewhere), otherwise its URL.
 */
function getLogoImageSource(): string
{
    $setting = Setting::where('key', '=', 'logo')->first();
    $media = $setting ? $setting->media->last() : null;

    if ($media) {
        try {
            $path = $media->getPath();
            if (is_file($path)) {
                return $path;
            }
        } catch (\Throwable $e) {
            // non-local disk (e.g. Cloudinary): fall back to the URL
        }

        return $media->getFullUrl();
    }

    return public_path('images/infyom.png');
}

if (! function_exists('getSettingValue')) {
    /**
     * @return mixed
     */
    function getSettingValue($keyName)
    {
        $key = 'setting'.'-'.$keyName;

        static $settingValues;

        if (isset($settingValues[$key])) {
            return $settingValues[$key];
        }

        /** @var Setting $setting */
        $setting = Setting::where('key', '=', $keyName)->first();
        $settingValues[$key] = $setting->value;

        return $setting->value;
    }
}

function canDelete(array $models, string $columnName, int $id): bool
{
    foreach ($models as $model) {
        $result = $model::where($columnName, $id)->exists();

        if ($result) {
            return true;
        }
    }

    return false;
}

function getCurrencyCode()
{
    $currencyId = Setting::where('key', '=', 'currency')->first()->value;

    return Currency::whereId($currencyId)->first()->symbol;
}

function getLoginUserLanguage(): string
{
    return \Illuminate\Support\Facades\Auth::user()->language;
}

if (! function_exists('manageStock')) {
    /**
     * @param $request
     * @return mixed
     */
    function manageStock($warehouseID, $productID, $qty = 0)
    {
        $product = ManageStock::whereWarehouseId($warehouseID)
            ->whereProductId($productID)
            ->first();

        if ($product) {
            $totalQuantity = $product->quantity + $qty;

            if (($product->quantity + $qty) < 0) {
                $totalQuantity = 0;
            }
            $product->update([
                'quantity' => $totalQuantity,
            ]);
        } else {
            if ($qty < 0) {
                $qty = 0;
            }

            ManageStock::create([
                'warehouse_id' => $warehouseID,
                'product_id' => $productID,
                'quantity' => $qty,
            ]);
        }
    }
}

if (! function_exists('keyExist')) {
    function keyExist($key)
    {
        $exists = Setting::where('key', $key)->exists();

        return $exists;
    }
}

function getSupplierGrandTotalFilterIds($search)
{
    $supplierData = Supplier::with('purchases')->get();
    $ids = [];
    foreach ($supplierData as $key => $supplier) {
        $value = $supplier->purchases->sum('grand_total');
        if ($search != '') {
            if ($value == $search) {
                $ids[] = $supplier->id;
            }
        }
    }

    return $ids;
}

if (! function_exists('replaceArrayValue')) {
    function replaceArrayValue(&$array, $key, $replaceValue)
    {
        foreach ($array as $index => $value) {
            if (is_array($value)) {
                $array[$index] = replaceArrayValue($value, $key, $replaceValue);
            }
            if ($index == $key) {
                $array[$index] = $replaceValue;
            }
        }

        return $array;
    }
}

if (! function_exists('getLogo')) {
    function getLogo()
    {
        /** @var Setting $setting */
        $logoImage = Setting::where('key', '=', 'logo')->first()->value;

        $logo = '';
        if (File::exists(asset($logoImage))) {
            $logo = base64_encode(file_get_contents(asset($logoImage)));
        }

        return 'data:image/png;base64,'.$logo;
    }
}

if (! function_exists('currencyAlignment')) {
    function currencyAlignment($amount)
    {
        if (getSettingValue('is_currency_right') != 1) {
            return getCurrencyCode().' '.$amount;
        }

        return $amount.' '.getCurrencyCode();
    }
}

if (! function_exists('numberToWords')) {
    /**
     * English words for a non-negative integer (international system: thousand, million, billion).
     */
    function numberToWords(int $number): string
    {
        $ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven',
            'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        $tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        if ($number === 0) {
            return 'Zero';
        }

        $belowThousand = function (int $n) use ($ones, $tens): string {
            $words = [];
            if ($n >= 100) {
                $words[] = $ones[intdiv($n, 100)].' Hundred';
                $n %= 100;
            }
            if ($n >= 20) {
                $words[] = $tens[intdiv($n, 10)].($n % 10 ? '-'.$ones[$n % 10] : '');
            } elseif ($n > 0) {
                $words[] = $ones[$n];
            }

            return implode(' ', $words);
        };

        $parts = [];
        foreach ([1000000000 => 'Billion', 1000000 => 'Million', 1000 => 'Thousand', 1 => ''] as $size => $label) {
            if ($number >= $size) {
                $chunk = intdiv($number, $size);
                $number %= $size;
                $parts[] = trim($belowThousand($chunk).' '.$label);
            }
        }

        return implode(' ', $parts);
    }
}

if (! function_exists('amountInWords')) {
    /**
     * e.g. 2690.50 => "Rupees Two Thousand Six Hundred Ninety and Fifty Cents Only".
     */
    function amountInWords($amount, string $major = 'Rupees', string $minor = 'Cents'): string
    {
        $amount = round(abs((float) $amount), 2);
        $whole = (int) floor($amount);
        $cents = (int) round(($amount - $whole) * 100);

        $words = $major.' '.numberToWords($whole);
        if ($cents > 0) {
            $words .= ' and '.numberToWords($cents).' '.$minor;
        }

        return $words.' Only';
    }
}

if (! function_exists('pdfWithPageNumbers')) {
    /**
     * Render a barryvdh/dompdf PDF and stamp "Page X of Y" bottom-right, aligned
     * with the shared pdf.partials.footer (dompdf 2.0 doesn't fill counter(pages)).
     *
     * @param  \Barryvdh\DomPDF\PDF  $pdf
     * @return \Barryvdh\DomPDF\PDF
     */
    function pdfWithPageNumbers($pdf)
    {
        $dompdf = $pdf->getDomPDF();
        $dompdf->render();
        $canvas = $dompdf->getCanvas();
        $metrics = $dompdf->getFontMetrics();
        $font = $metrics->getFont('DejaVu Sans') ?: $metrics->getFont('Helvetica');
        $size = 6;
        $text = 'Page {PAGE_NUM} of {PAGE_COUNT}';
        $width = $metrics->getTextWidth('Page 99 of 99', $font, $size);
        $mm = 72 / 25.4;
        $x = $canvas->get_width() - 16 * $mm - $width;
        $y = $canvas->get_height() - 22 * $mm + 14 * $mm - 10 * $mm + 3.6;
        $canvas->page_text($x, $y, $text, $font, $size, [0.27, 0.27, 0.27]);

        return $pdf;
    }
}
