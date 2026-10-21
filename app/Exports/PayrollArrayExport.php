<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithTitle;

/**
 * Generic rows (first row = header) for the payroll summary, bank transfer and EPF/ETF sheets.
 */
class PayrollArrayExport implements FromArray, ShouldAutoSize, WithTitle
{
    private array $rows;

    private string $title;

    public function __construct(array $rows, string $title)
    {
        $this->rows = $rows;
        $this->title = substr($title, 0, 31);
    }

    public function title(): string
    {
        return $this->title;
    }

    public function array(): array
    {
        return $this->rows;
    }
}
