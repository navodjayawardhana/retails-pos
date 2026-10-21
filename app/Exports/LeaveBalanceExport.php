<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithTitle;

/**
 * Employee × leave type balances from LeaveService::balanceReport().
 */
class LeaveBalanceExport implements FromArray, ShouldAutoSize, WithTitle
{
    private array $report;

    public function __construct(array $report)
    {
        $this->report = $report;
    }

    public function title(): string
    {
        return 'Leave balances '.$this->report['year'];
    }

    public function array(): array
    {
        $header = ['Code', 'Employee', 'Branch', 'Department'];
        foreach ($this->report['types'] as $type) {
            $label = $type['name'];
            if ($type['is_unlimited']) {
                $header[] = $label.' used';
            } else {
                $header[] = $label.' entitled';
                $header[] = $label.' used';
                $header[] = $label.' pending';
                $header[] = $label.' balance';
            }
        }

        $rows = [$header];
        foreach ($this->report['rows'] as $row) {
            $line = [$row['employee_code'], $row['employee_name'], $row['branch_name'], $row['department_name']];
            foreach ($this->report['types'] as $type) {
                $cell = $row['cells'][$type['id']] ?? null;
                if ($type['is_unlimited']) {
                    $line[] = $cell ? $cell['used'] : '';
                } else {
                    $line[] = $cell ? $cell['entitled'] : '';
                    $line[] = $cell ? $cell['used'] : '';
                    $line[] = $cell ? $cell['pending'] : '';
                    $line[] = $cell ? $cell['balance'] : '';
                }
            }
            $rows[] = $line;
        }

        return $rows;
    }
}
