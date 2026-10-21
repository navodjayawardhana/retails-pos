<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

/**
 * Renders report PDFs with the shared black & white layout and stores them next to
 * the app's other PDFs, returning a public URL (same pattern as sale-pdf-download).
 */
class ReportPdfService
{
    /**
     * Tabular report via pdf.partials.statement. Wide tables switch to landscape.
     *
     * @param  array  $st  see resources/views/pdf/partials/statement.blade.php
     */
    public function table(array $st, string $fileName): string
    {
        $columns = count($st['columns'] ?? []);
        $st['landscape'] = $st['landscape'] ?? $columns > 8;
        $st['compact'] = $st['compact'] ?? $columns > 11;

        return $this->render('pdf.partials.statement', ['st' => $st], $fileName);
    }

    /**
     * Any report view; the view sets its own @page size.
     */
    public function render(string $view, array $data, string $fileName): string
    {
        $data['companyLogo'] = $data['companyLogo'] ?? $this->logo();

        $pdf = Pdf::loadView($view, $data)->setOptions([
            'tempDir' => public_path(),
            'chroot' => public_path(),
        ]);

        $path = 'pdf/reports/'.$fileName;
        $disk = Storage::disk(config('app.media_disc'));
        if ($disk->exists($path)) {
            $disk->delete($path);
        }
        $disk->put($path, pdfWithPageNumbers($pdf)->output());

        return $disk->url($path);
    }

    public function money($value): string
    {
        return number_format((float) $value, 2);
    }

    private function logo(): ?string
    {
        try {
            return (string) \Image::make(getLogoImageSource())->encode('data-url');
        } catch (\Throwable $e) {
            return null;
        }
    }
}
