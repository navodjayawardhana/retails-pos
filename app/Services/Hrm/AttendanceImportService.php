<?php

namespace App\Services\Hrm;

use App\Models\Employee;
use Carbon\Carbon;

/**
 * Parses attendance CSV exports from fingerprint/biometric devices.
 *
 * Accepted layouts (header row required, column names case-insensitive):
 *  - Punch log:  employee_code, date, time            (many rows per day; first = in, last = out)
 *                or employee_code, datetime            (e.g. "2026-10-21 08:31")
 *  - Summary:    employee_code, date, clock_in, clock_out
 * Dates: Y-m-d, d/m/Y, d-m-Y, d.m.Y. Times: H:i, H:i:s, h:i A.
 */
class AttendanceImportService
{
    private const ALIASES = [
        'employee_code' => ['employee_code', 'emp_code', 'code', 'employee_id', 'emp_id', 'employee no', 'employee_no', 'ac-no', 'ac_no', 'user_id'],
        'date' => ['date', 'day', 'att_date'],
        'time' => ['time', 'punch_time', 'check_time'],
        'datetime' => ['datetime', 'date_time', 'punch', 'timestamp', 'checktime'],
        'clock_in' => ['clock_in', 'in', 'in_time', 'check_in', 'time_in'],
        'clock_out' => ['clock_out', 'out', 'out_time', 'check_out', 'time_out'],
    ];

    /**
     * @return array{format: string, rows: array, valid_count: int, error_count: int}
     */
    public function parse(string $path): array
    {
        $handle = fopen($path, 'r');
        if (! $handle) {
            return $this->failure('Could not read the uploaded file.');
        }

        $header = fgetcsv($handle);
        if (! $header) {
            fclose($handle);

            return $this->failure('The file is empty.');
        }
        $header = array_map(fn ($h) => strtolower(trim(preg_replace('/^\xEF\xBB\xBF/', '', (string) $h))), $header);
        $map = $this->mapColumns($header);

        if (! isset($map['employee_code'])) {
            fclose($handle);

            return $this->failure('Missing an "employee_code" column.');
        }
        $isSummary = isset($map['clock_in']) || isset($map['clock_out']);
        $isPunch = ! $isSummary && (isset($map['time']) || isset($map['datetime']));
        if (! $isSummary && ! $isPunch) {
            fclose($handle);

            return $this->failure('Add either "time" (punch log) or "clock_in"/"clock_out" (summary) columns.');
        }
        if (! isset($map['date']) && ! isset($map['datetime'])) {
            fclose($handle);

            return $this->failure('Missing a "date" column.');
        }

        $employees = Employee::get(['id', 'employee_code', 'first_name', 'last_name', 'status'])
            ->keyBy(fn ($e) => strtoupper($e->employee_code));

        $punches = [];
        $rows = [];
        $line = 1;
        while (($cells = fgetcsv($handle)) !== false) {
            $line++;
            if (count(array_filter($cells, fn ($c) => trim((string) $c) !== '')) === 0) {
                continue;
            }
            $get = fn ($key) => isset($map[$key]) ? trim((string) ($cells[$map[$key]] ?? '')) : '';
            $code = strtoupper($get('employee_code'));
            $errors = [];
            $employee = $employees->get($code);
            if ($code === '') {
                $errors[] = 'Employee code is empty.';
            } elseif (! $employee) {
                $errors[] = "No employee with code {$code}.";
            }

            $date = null;
            $time = null;
            if (isset($map['datetime']) && $get('datetime') !== '') {
                $dt = $this->parseDateTime($get('datetime'));
                if ($dt) {
                    $date = $dt->toDateString();
                    $time = $dt->format('H:i');
                } else {
                    $errors[] = 'Invalid date/time "'.$get('datetime').'".';
                }
            } else {
                $date = $this->parseDate($get('date'));
                if (! $date) {
                    $errors[] = 'Invalid date "'.$get('date').'".';
                }
            }

            if ($isPunch) {
                if ($time === null) {
                    $time = $this->parseClock($get('time'));
                    if (! $time) {
                        $errors[] = 'Invalid time "'.$get('time').'".';
                    }
                }
                if ($errors) {
                    $rows[] = $this->row($line, $code, $employee, $date, null, null, $errors);
                } else {
                    $key = $employee->id.'|'.$date;
                    $punches[$key] ??= ['line' => $line, 'code' => $code, 'employee' => $employee, 'date' => $date, 'times' => []];
                    $punches[$key]['times'][] = $time;
                }
            } else {
                $in = $get('clock_in') !== '' ? $this->parseClock($get('clock_in')) : null;
                $out = $get('clock_out') !== '' ? $this->parseClock($get('clock_out')) : null;
                if ($get('clock_in') !== '' && ! $in) {
                    $errors[] = 'Invalid clock-in "'.$get('clock_in').'".';
                }
                if ($get('clock_out') !== '' && ! $out) {
                    $errors[] = 'Invalid clock-out "'.$get('clock_out').'".';
                }
                if (! $in && ! $out && ! $errors) {
                    $errors[] = 'Both clock-in and clock-out are empty.';
                }
                $rows[] = $this->row($line, $code, $employee, $date, $in, $out, $errors);
            }
        }
        fclose($handle);

        foreach ($punches as $group) {
            sort($group['times']);
            $in = $group['times'][0];
            $out = count($group['times']) > 1 ? end($group['times']) : null;
            $rows[] = $this->row($group['line'], $group['code'], $group['employee'], $group['date'], $in, $out, [],
                count($group['times']));
        }

        usort($rows, fn ($a, $b) => $a['row'] <=> $b['row']);
        $errorCount = count(array_filter($rows, fn ($r) => ! empty($r['errors'])));

        return [
            'format' => $isPunch ? 'punch_log' : 'summary',
            'rows' => $rows,
            'valid_count' => count($rows) - $errorCount,
            'error_count' => $errorCount,
        ];
    }

    private function row(int $line, string $code, ?Employee $employee, ?string $date, ?string $in, ?string $out, array $errors, ?int $punches = null): array
    {
        return [
            'row' => $line,
            'employee_code' => $code,
            'employee_id' => $employee ? $employee->id : null,
            'employee_name' => $employee ? $employee->full_name : null,
            'date' => $date,
            'clock_in' => $in,
            'clock_out' => $out,
            'punches' => $punches,
            'errors' => $errors,
        ];
    }

    private function failure(string $message): array
    {
        return ['format' => null, 'rows' => [], 'valid_count' => 0, 'error_count' => 0, 'message' => $message];
    }

    private function mapColumns(array $header): array
    {
        $map = [];
        foreach (self::ALIASES as $key => $aliases) {
            foreach ($header as $index => $name) {
                if (in_array($name, $aliases, true)) {
                    $map[$key] = $index;
                    break;
                }
            }
        }

        return $map;
    }

    public function parseDate(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        foreach (['Y-m-d', 'd/m/Y', 'd-m-Y', 'd.m.Y', 'Y/m/d', 'j/n/Y'] as $format) {
            $date = \DateTime::createFromFormat('!'.$format, $value);
            if ($date && $date->format($format) === $value) {
                return $date->format('Y-m-d');
            }
        }

        return null;
    }

    public function parseClock(string $value): ?string
    {
        $value = strtoupper(trim($value));
        if ($value === '') {
            return null;
        }
        foreach (['H:i', 'H:i:s', 'G:i', 'G:i:s', 'h:i A', 'g:i A', 'h:iA', 'g:iA', 'h:i:s A'] as $format) {
            $time = \DateTime::createFromFormat('!'.$format, $value);
            // createFromFormat overflows (25:99 -> next day) instead of failing; reject any warnings
            $errors = \DateTime::getLastErrors();
            $clean = ! $errors || ($errors['warning_count'] === 0 && $errors['error_count'] === 0);
            if ($time && $clean && $time->format('Y-m-d') === '1970-01-01') {
                return $time->format('H:i');
            }
        }

        return null;
    }

    private function parseDateTime(string $value): ?Carbon
    {
        $parts = preg_split('/[ T]+/', trim($value), 2);
        if (count($parts) !== 2) {
            return null;
        }
        $date = $this->parseDate($parts[0]);
        $time = $this->parseClock($parts[1]);

        return $date && $time ? Carbon::parse($date.' '.$time) : null;
    }
}
