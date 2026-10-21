<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithTitle;

/**
 * Monthly attendance sheet (employee × day codes + totals) from AttendanceService::monthlySheet().
 */
class AttendanceMonthlyExport implements FromArray, ShouldAutoSize, WithTitle
{
    private array $sheet;

    public function __construct(array $sheet)
    {
        $this->sheet = $sheet;
    }

    public function title(): string
    {
        return sprintf('Attendance %04d-%02d', $this->sheet['year'], $this->sheet['month']);
    }

    public function array(): array
    {
        $header = ['Code', 'Employee', 'Branch', 'Department'];
        foreach ($this->sheet['days'] as $day) {
            $header[] = $day['day'].' '.$day['weekday'];
        }
        $header = array_merge($header, ['Present', 'Late', 'Half day', 'Absent', 'Leave', 'Holiday', 'Unmarked', 'OT hours', 'Late minutes']);

        $rows = [$header];
        foreach ($this->sheet['rows'] as $row) {
            $line = [$row['employee_code'], $row['employee_name'], $row['branch_name'], $row['department_name']];
            foreach ($this->sheet['days'] as $day) {
                $line[] = $row['days'][$day['day']] ?? '';
            }
            $t = $row['totals'];
            $rows[] = array_merge($line, [
                $t['present'], $t['late'], $t['half_day'], $t['absent'], $t['leave'], $t['holiday'], $t['unmarked'],
                round($t['ot_minutes'] / 60, 2), $t['late_minutes'],
            ]);
        }

        $rows[] = [];
        $rows[] = ['Codes: P present, L late, HD half day, A absent, LV leave, H holiday, W weekend, - not marked'];

        return $rows;
    }
}
