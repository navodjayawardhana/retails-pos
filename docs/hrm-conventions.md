# HRM conventions (phase 1 foundation)

Notes for the agents building later HRM phases. Follow the existing app patterns; this file
records what phase 1 created and the rules later phases must keep.

## Requirements (from the owner)

1. **Branches.** Branch = existing `warehouses` row. `employees.warehouse_id` (UI label "Branch").
   Attendance, leave and payroll screens and reports must filter by branch too.
2. **Salary.** Monthly and daily wage are both first-class (`employees.salary_type` = `monthly|daily`;
   `basic_salary` is the monthly salary or the daily rate). Keep it flexible.
3. **OT / late.** Global defaults in `hr_settings`, per-employee overrides on `employees`:
   `ot_eligible` (bool, default true), `ot_rate_multiplier` (nullable), `late_deduction_enabled`
   (nullable), `work_start` / `work_end` (nullable).
   **Fallback order: employee override → shift (phase 2) → hr_settings.** Null means "fall back".
4. **Leave.** Dynamic and employee-wise. Phase 3: leave types with default yearly days AND
   per-employee entitlement overrides. Nothing was added for leave in phase 1.
5. **Attendance.** Automatic and manual, configurable. Settings (booleans in `hr_settings`):
   `attendance_pos_auto`, `auto_clock_in_on_pos_login`, `attendance_manual`,
   `attendance_device_import` (CSV from fingerprint/biometric devices, mapped by `employee_code`).
   Phase 2 implements all three.
6. **EPF/ETF.** Basic salary is always EPF-liable. Phase 4: each allowance/earning component gets an
   `epf_liable` flag. Rates are settings (`epf_employee_rate` 8, `epf_employer_rate` 12, `etf_rate` 3).
   Per employee: `employees.epf_applicable` (bool, default true; false e.g. for daily/contract staff).
7. **Users can be employees.** One user ↔ at most one employee (`employees.user_id` is unique, nullable,
   FK users, nullOnDelete). `User::employee()` (hasOne) and `Employee::user()`.
   Phase 2 relies on user → employee for POS auto clock-in, and self-service ("my attendance / leave /
   payslips") via the `view_own_hr` permission.

## Database

| Table | Notes |
|---|---|
| `departments` | `name` unique, `description` |
| `designations` | `name`, `department_id` (nullable FK, nullOnDelete), `description`; unique (`name`,`department_id`) |
| `employees` | see migration `2026_10_21_000003`; `employee_code` auto `EMP-0001` (`Employee::generateCode()`), `status` = `active|resigned|terminated` |
| `hr_settings` | key/value (same style as `settings`). Defaults + typed access in `App\Models\HrSetting` (`DEFAULTS`, `BOOLEAN_KEYS`, `NUMERIC_KEYS`, `HrSetting::getAll()`, `HrSetting::get($key)`). `weekend_days` is a JSON array of weekday numbers (0 = Sunday). Add new settings by adding to `DEFAULTS` (+ rules) and inserting the row in a migration. |

All tables are InnoDB (`$table->engine = 'InnoDB'` — this MySQL defaulted to MyISAM before).

Media (spatie medialibrary, disk `config('app.image_disk')`): collections `employee_photo`
(`Employee::PHOTO_PATH`) and `employee_documents` (`Employee::DOCUMENT_PATH`, custom property `title`).
`App\MediaLibrary\CustomPathGenerator` now falls back to a folder named after any unknown collection,
so new collections don't need a case there.

## Backend

- Models: `Department`, `Designation`, `Employee`, `HrSetting` (`app/Models`). JSON:API style via
  `HasJsonResourcefulData` + `prepareAttributes()`; resources `{Model}Resource` / `{Model}Collection`.
- Repositories: `DepartmentRepository`, `DesignationRepository`, `EmployeeRepository`
  (`storeEmployee`, `updateEmployee`, `addDocument`, `availableUsers`). Creating a login
  (`create_login=1`, `login_email`, `login_password`, `login_role_id`) goes through
  `UserRepository::storeUser` — reuse it, don't duplicate user creation.
- Controllers (`app/Http/Controllers/API`): `DepartmentAPIController`, `DesignationAPIController`,
  `EmployeeAPIController`, `HrSettingAPIController`.
- Routes (`routes/api.php`, inside the `auth:sanctum` group, block commented `// HRM`):
  - `departments` and `designations` resource routes (`?page[size]=0` = all, for dropdowns;
    designations accept `?department_id=`).
  - `employees` resource. Update is `POST employees/{id}` (multipart). List filters: `department_id`,
    `designation_id`, `warehouse_id`, `status`, `filter[search]` (code, names, NIC, phone, email).
  - `DELETE employees/{id}/photo`, `POST employees/{id}/documents`, `DELETE employees/{id}/documents/{mediaId}`,
    `POST employees/{id}/unlink-user`, `GET employee-available-users?employee_id=`, `GET employee-next-code`.
  - `GET hr-settings`, `POST hr-settings` (partial updates allowed).
- Route permission middleware is not used in this app (the lines are commented out everywhere);
  the frontend gates by permission. Follow the same.
- Note: the axios interceptor redirects to the dashboard on any 403/404 response, so use 422
  (`sendError`) for "not allowed / not found" business errors the UI should show as a toast.

## Permissions

Seeder `database/seeders/AddHrmPermissionsSeeder.php` (run by migration `2026_10_21_000005`), all given
to the admin role: `manage_employees`, `manage_departments` (also designations), `manage_hr_settings`,
`manage_attendance`, `manage_leave`, `manage_payroll`, `view_own_hr`. Frontend constants:
`Permissions.MANAGE_EMPLOYEES`, `MANAGE_DEPARTMENTS`, `MANAGE_HR_SETTINGS`, `MANAGE_ATTENDANCE`,
`MANAGE_LEAVE`, `MANAGE_PAYROLL`, `VIEW_OWN_HR` (`resources/pos/src/constants/index.js`).
New phases: add a seeder + migration like phase 1 if you need more permissions.

## Frontend (`resources/pos/src`)

- Constants: `apiBaseURL.DEPARTMENTS|DESIGNATIONS|EMPLOYEES|EMPLOYEE_AVAILABLE_USERS|HR_SETTINGS`,
  action types in `hrmActionType`.
- Redux: actions in `store/action/hrm/hrmActions.js` (`fetchDepartments`, `fetchAllDepartments`,
  `saveDepartment`, `deleteDepartment`, same for designations, `fetchEmployees(filter, isLoading, extra)`,
  `fetchEmployee`, `clearEmployee`, `saveEmployee(id, formData, navigate)`, `deleteEmployee`,
  `uploadEmployeeDocument`, `deleteEmployeeDocument`, `unlinkEmployeeUser`, `fetchEmployeeAvailableUsers`,
  `fetchHrSettings`, `saveHrSettings`). Reducers in `store/reducers/hrmReducers.js`, state keys
  `departments`, `allDepartments`, `designations`, `allDesignations`, `employees`, `employee`,
  `employeeAvailableUsers`, `hrSettings`. Put new HRM actions in `store/action/hrm/` and reducers in
  their own file registered in `store/reducers/index.js`.
- Pages: `components/hrm/{employees,departments,designations,settings}`. Routes in `routes.js`
  (`employees`, `employees/create`, `employees/edit/:id`, `employees/detail/:id`, `departments`,
  `designations`, `hr-settings`). `employees/create?user_id=N` prefills from a user and pre-links it.
- Sidebar: `config/asideConfig.js`, the entry with `name: "hrm"`. Append new items to its `subMenu`
  and their paths to its `subPath` (the sidebar highlights the HRM group for any `subPath` and its
  sub-URLs — generic check in `components/sidebar/asideMenu.js`). The page header breadcrumb comes from
  the same config automatically.
- Employee detail tabs: `components/hrm/employees/detail/employeeDetailTabs.js` is a registry.
  Replace the `EmployeePlaceholderTab` component for `attendance`, `leave`, `payroll` with your tab
  component; it receives `{ employee }` (= `{ id, ...attributes }`).
- Users ↔ employee UI: `components/hrm/employees/EmployeeLinkButton.js` (users list + user detail);
  user API attributes now include `employee_id`.
- Styles: `assets/scss/custom/pages/_hrm.scss` (compiled into `custom.css` by the rtl watcher).
  Reuse the shared look: `ReactDataTable`, `ActionButton`, `HeaderTitle`, `form-action-bar`,
  `empty-state`, badges `bg-light-*`.
- i18n: `hrm.*` keys in `locales/en.json`.

---

# Phase 2: attendance, shifts, holidays

## Timezone (important)

The app runs in **UTC** (`config/app.php`) and that was left unchanged, because changing it would shift
every existing sale timestamp. HR has its own clock instead: the `hr_settings.timezone` setting
(default `Asia/Colombo`, editable in HR Settings).
- Use `HrSetting::now()` and `HrSetting::today()` for HR "now" and "today" — **never `now()`**.
- `HrSetting::now()` returns a Carbon holding the HR wall-clock time in the app timezone.
- Attendance `clock_in` / `clock_out` store **local wall-clock datetimes**.
- Phase 3 and 4 must use the same helpers for leave dates and payroll periods.

## Tables (migrations `2026_10_21_000006`–`000009`)

| Table | Notes |
|---|---|
| `shifts` | `name` unique, `start_time`, `end_time`, `break_minutes`, `late_grace_minutes` (nullable → setting), `half_day_hours` (nullable → setting), `is_night_shift`, `weekly_off_days` JSON (null → `hr_settings.weekend_days`), `description` |
| `employee_shifts` | `employee_id`, `shift_id`, `from_date`, `to_date` (null = open ended). Assigning ends the employee's earlier open/overlapping assignment the day before the new `from_date`. The latest `from_date` wins. |
| `holidays` | `name`, `date`, `type` (`poya`, `public`, `mercantile`, `company`), `is_paid`, `warehouse_id` (null = all branches) |
| `attendances` | One row per employee per date, unique (`employee_id`,`date`). Fields: `clock_in`/`clock_out` (local datetimes), `status`, `late_minutes`, `early_leave_minutes`, `worked_minutes`, `ot_minutes`, `source`, `notes`, `created_by`. `status` is one of `present`, `late`, `half_day`, `absent`, `leave`, `holiday`, `weekend`. `source` is one of `pos_auto`, `manual`, `device_import`, `self`. |

New settings: `auto_clock_out_on_logout` (bool, default false) and `timezone`.

## Services (`app/Services/Hrm`). Reuse them; never compute or write attendance fields elsewhere.

### `WorkScheduleService`
- **`forDate(Employee $e, string $date): array`** — `start`, `end`, `start_at`/`end_at` (Carbon; a night shift ends the next day), `break_minutes`, `grace_minutes`, `half_day_minutes`, `expected_minutes` (0 on off days), `is_weekend`, `is_saturday_half_day`, `is_holiday`, `holiday` (model|null), `is_working_day`, `shift_id`, `shift_name`, `ot_eligible`, `ot_multiplier` and `late_deduction_enabled`.
  - Times fall back: employee `work_start`/`work_end` → active shift → `hr_settings`.
  - Grace and half-day hours: shift → settings. Off days: shift → settings.
  - A Saturday half day means: end = start + half-day hours, no break.
  - The flags come from employee → settings.
- **`workingDays(Employee $e, string $from, string $to): float`** — counts working days; a Saturday half day counts 0.5. Payroll will use this.
- **`activeShiftAssignment(Employee $e, string $date): ?EmployeeShift`**
- **`holidayFor(Employee $e, string $date): ?Holiday`** — branch-aware.

### `AttendanceService`
- **`calculate(Employee, date, ?Carbon in, ?Carbon out, ?forcedStatus)`**
  - Late is counted only beyond grace, and only on working days.
  - Worked time is gross minus break; the break is subtracted only when gross time exceeds the half-day minutes.
  - On a working day, OT = minutes after the scheduled end. On a holiday or weekend, all worked minutes are OT. Either way, only when `ot_eligible`.
  - A clock-out at or before the clock-in is treated as the next day.
- **`record(Employee, date, ?in, ?out, source='manual', ?forcedStatus=null, ?notes=null, ?createdBy=null): Attendance`** — upserts the row. `$in`/`$out` accept `"08:30"`, `"8:30 AM"` or `"Y-m-d H:i"`.
  - `forcedStatus` accepts `leave`, `absent`, `holiday`, `weekend` or `half_day` to override the computed status.
  - `present`/`late` are only accepted when there are no times (a hand-marked day with no hours).
- **`markLeave(Employee, date, ?notes, ?createdBy)`** and **`unmarkLeave(Employee, date)`** — phase 3 calls these when leave is approved or cancelled.
- **`clockIn(Employee, source, ?Carbon now)`** and **`clockOut(Employee, source, ?Carbon now)`** — clock-in is a no-op if today already has a clock-in. Clock-out takes today's or yesterday's open record (night shifts).
- **`autoClockInOnLogin(User)`** and **`autoClockOutOnLogout(User)`** — called from `API\AuthController` login and logout. They never throw.
- **`summary(Employee, from, to, ?records): array`** — keys:
  - day counts per status, plus `unmarked`
  - `worked_minutes`, `ot_minutes`, `late_minutes`, `early_leave_minutes`
  - `working_days` (float), `paid_holidays`

  **`unmarked`** means past working days with no row. These are NOT counted as absent; payroll decides how to treat them.
- **`dailyReport(date, filters)`** and **`monthlySheet(year, month, filters)`** — filters: `warehouse_id`, `department_id`, `designation_id`, `employee_id`. Day codes: `P` present, `L` late, `HD` half day, `A` absent, `LV` leave, `H` holiday, `W` weekend, `-` unmarked.

### `AttendanceImportService::parse(path)`
- **Punch log:** `employee_code,date,time` (or a `datetime` column). One row per punch: the first punch is the in, the last is the out.
- **Daily summary:** `employee_code,date,clock_in,clock_out`.
- **Dates:** `Y-m-d`, `d/m/Y`, `d-m-Y`, `d.m.Y`.
- **Times:** 24h or 12h. Validation is strict, so `25:99` is rejected.
- **Samples:** `public/import_demo_files/attendance_*_sample.csv`.

## API (`routes/api.php`, block `// HRM phase 2`)

- **Shifts:** `shifts` resource (`?page[size]=0` returns all).
  - `GET shift-assignments?employee_id=&shift_id=&current=1`
  - `POST shift-assignments {shift_id, employee_ids[], from_date, to_date?}`
  - `DELETE shift-assignments/{id}`
  - Deleting a shift is refused (422) while it has current assignments.
- **Holidays:** `holidays` resource, filters `year`, `month`, `type`, `warehouse_id`.
  - `POST holidays/bulk {name, type, is_paid, warehouse_id?, dates[]}` skips existing name+date+branch.
- **Attendance:**
  - `attendances` (index/store/update/destroy). Index filters: `date`, `date_from`, `date_to`, `employee_id`, `warehouse_id`, `department_id`, `status`, `filter[search]`.
  - `GET attendance-sheet?date=&warehouse_id=&department_id=` returns grid rows for all active employees.
  - `POST attendances/bulk {date, records:[{employee_id,status,clock_in,clock_out,notes}]}` — a row with no status and no times deletes that day's record.
  - Manual entry returns 422 when `attendance_manual` is off.
  - `POST attendance-import/preview` (multipart `file`) and `POST attendance-import/commit {records:[{employee_id,date,clock_in,clock_out}]}` — both return 422 when `attendance_device_import` is off.
  - `GET attendance-summary?employee_id=&month=YYYY-MM` (employee tab).
  - `GET attendance-reports/daily?date=`, `GET attendance-reports/monthly?month=`, `GET attendance-reports/monthly-excel?month=` (returns `attendance_excel_url`).
- **Self service:** `GET my-attendance?month=`, `POST my-attendance/clock-in`, `POST my-attendance/clock-out`.
  - Body `{source:"pos"}` records `pos_auto`. The POS Register Options menu has "Clock out".
  - Returns 422 if the user isn't linked to an active employee.

## Frontend

- **Constants:** `apiBaseURL.SHIFTS|SHIFT_ASSIGNMENTS|HOLIDAYS|ATTENDANCES|ATTENDANCE_SHEET|ATTENDANCE_IMPORT|ATTENDANCE_SUMMARY|ATTENDANCE_REPORTS|MY_ATTENDANCE`, and `hrmActionType.FETCH_SHIFTS|FETCH_ALL_SHIFTS|FETCH_HOLIDAYS`.
- **Actions:** `store/action/hrm/attendanceActions.js`. List fetchers go through redux (`shifts`, `allShifts`, `holidays` from `store/reducers/attendanceReducers.js`); everything else returns promises. `fetchActiveEmployeeOptions()` gives employee select options.
- **Pages:** `components/hrm/{shifts,holidays,attendance}`.
  - Routes: `/app/attendance` (manual grid + device import), `/app/my-attendance` (`view_own_hr`), `/app/shifts`, `/app/holidays`, `/app/attendance-reports`.
  - Sidebar items are appended to the HRM group.
- **Shared UI:** `components/hrm/attendance/attendanceShared.js` (`AttendanceStatusBadge`, `formatMinutes`, `AttendanceSummaryChips`, `todayString`, `weekdayLabel` → phase-1 keys `hrm.day.N`) and `AttendanceMonthView.js`, which the employee detail Attendance tab (`EmployeeAttendanceTab`) reuses.
- **Gotcha:** `shared/table/ReactDataTable.js` memoizes its toolbar (`AddButton`) and columns with `[]`, so they freeze at first render. Put stateful filters in your own bar above the table (class `hrm-filter-bar`); only static buttons go in `AddButton`.

---

# Phase 3: leave

## Tables (migrations `2026_10_21_000010`–`000013`)

| Table | Notes |
|---|---|
| `leave_types` | `name`/`code` unique, `default_days_per_year`, `is_unlimited` (no cap, e.g. No Pay), `is_paid`, `allow_half_day`, `carry_forward` + `max_carry_forward_days` (null = no cap), `requires_document`, `gender` (null/`male`/`female`), `color`, `is_active`. Seeded: AL 14 (carry ≤7), CL 7, ML 7 (document), NP unlimited unpaid. Deleting a type with requests → 422 (deactivate instead). |
| `leave_entitlements` | One row per employee + type + year: `days` (allowed), `carried_forward`, `is_custom` (set by hand). Entitled total = `days + carried_forward`. No row = the type default applies (pro-rated). |
| `leave_requests` | `from_date`/`to_date` (always within one calendar year), `is_half_day` + `half_session` (`first`/`second`), `days` (working days), `status` `pending\|approved\|rejected\|cancelled`, `approved_by`/`approved_at`, `remarks`, `marked_dates` (attendance dates this leave set to `leave`), `conflict_dates` (working dates left alone because the employee had clocked in), `created_by`. Attachment: medialibrary collection `leave_attachments` (`LeaveRequest::ATTACHMENT_PATH`) on `config('app.image_disk')`. |

New setting: `prorate_first_year` (bool, default true) — joiners get `days × remaining months (joining month included) / 12`, rounded down to 0.5.

## `App\Services\Hrm\LeaveService` (every leave write goes through it)

- `defaultDays(Employee, LeaveType, int $year): float` — type default, pro-rated in the joining year; 0 before joining / for unlimited.
- `carryForwardFrom(Employee, LeaveType, int $year): float` — previous year's unused (previous year's stored allowance, or its default if never set up), capped by `max_carry_forward_days`.
- `entitledTotal(Employee, LeaveType, int $year, bool $fallbackToDefault = true): ?float` — null for unlimited.
- `initialiseYear(int $year, ?array $employeeIds = null, bool $overwriteCustom = false): array{created,updated,skipped}` — active employees × active limited types (gender respected); keeps `is_custom` rows unless overwriting.
- `setEntitlements(Employee, int $year, array $items)` — items `[{leave_type_id, days, carried_forward?}]`, marks rows custom.
- `usedDays(Employee, LeaveType, int $year, array $statuses = ['approved'], ?int $excludeId = null): float`
- `balances(Employee, int $year): array` — per type: `days`, `carried_forward`, `entitled`, `used`, `pending`, `balance` (null when unlimited), `is_custom`, `has_row`, plus type flags.
- `countDays(Employee, from, to, bool $isHalfDay): float` — uses `WorkScheduleService::workingDays` (weekends/holidays excluded, Saturday half day 0.5); half day = 0.5 if the date is a working day.
- `validateRequest(...)` — 422 messages for: inactive employee/type, gender, end < start, crossing years, half-day rules, missing document, no working days, overlap with pending/approved (two different half-day sessions on one date may coexist), insufficient balance (pending counted; skipped for unlimited).
- `apply(array $data, ?int $userId, $attachment = null, bool $approveNow = false): LeaveRequest`
- `approve(LeaveRequest, ?int $userId, ?string $remarks)` — re-validates, then `AttendanceService::markLeave` for each FULL working day without a clock-in; clocked-in days go to `conflict_dates`. **Half-day leave never changes attendance.**
- `reject(...)`, `cancel(...)` — if the request was approved, `unmarkLeave` for its `marked_dates`.
- `delete(LeaveRequest)` — reverts attendance if approved, removes attachments.
- `workingDates(Employee, from, to): string[]`
- **`monthSummary(Employee, int $year, int $month): array{paid_days, unpaid_days, by_type[]}`** — for payroll.
- `calendar(from, to, filters)`, `balanceReport(int $year, filters)` — filters `warehouse_id`, `department_id` (+ `employee_id` for the report).

### How payroll (phase 4) should count leave
Use `LeaveService::monthSummary()` — NOT attendance rows. It counts approved requests per working date inside the month (requests crossing month ends are split; Saturday half day = 0.5; half-day request = 0.5).
- `paid_days`: paid leave — no deduction.
- `unpaid_days`: e.g. No Pay — deduct as no-pay days.
Attendance rows with status `leave` exist only for full days without a clock-in, so don't treat attendance `leave` as unpaid on its own; and attendance `unmarked` days that are covered by approved leave are already accounted for by `monthSummary`.

## API (`routes/api.php`, block `// HRM phase 3: leave`)

- `leave-types` resource (`?page[size]=0` all, `?active=1`).
- `GET leave-entitlements?employee_id=&year=` → `{balances, requests}`; `POST leave-entitlements {employee_id, year, items[]}`; `POST leave-entitlements/initialise {year, overwrite_custom?}`.
- `leave-requests` index/store/show/destroy. Index filters: `status`, `leave_type_id`, `employee_id`, `warehouse_id`, `department_id`, `date_from`, `date_to` (overlap), `filter[search]`. Store is multipart: `employee_id, leave_type_id, from_date, to_date, is_half_day, half_session, reason, attachment, approve_now`.
- `POST leave-requests/{id}/approve|reject|cancel {remarks?}` — responses are `{data: LeaveRequestResource}` (one level deeper than lists).
- `GET leave-preview?employee_id=&leave_type_id=&from_date=&to_date=&is_half_day=&half_session=` → `{days, balance, pending, is_unlimited, requires_document, error}` (never 422).
- `GET leave-calendar?month=YYYY-MM&warehouse_id=&department_id=`, `GET leave-reports/balances?year=…`, `GET leave-reports/balances-excel` (→ `leave_excel_url`).
- Self service: `GET my-leave?year=` (balances, requests, applicable `leave_types`), `GET my-leave/preview`, `POST my-leave` (always pending), `POST my-leave/{id}/cancel` (own pending only).

## Frontend

- Constants: `apiBaseURL.LEAVE_TYPES|LEAVE_ENTITLEMENTS|LEAVE_REQUESTS|LEAVE_PREVIEW|LEAVE_CALENDAR|LEAVE_REPORTS|MY_LEAVE`; `hrmActionType.FETCH_LEAVE_TYPES|FETCH_ALL_LEAVE_TYPES|FETCH_LEAVE_REQUESTS`.
- Actions `store/action/hrm/leaveActions.js`; reducers `store/reducers/leaveReducers.js` → state `leaveTypes`, `allLeaveTypes`, `leaveRequests`.
- Pages `components/hrm/leave/`: `LeaveRequests` (/app/leave-requests), `MyLeave` (/app/my-leave, `view_own_hr`), `LeaveCalendar` (/app/leave-calendar), `LeaveTypes` (/app/leave-types), `LeaveBalances` (/app/leave-balances, also "Set up leave year"). Shared: `leaveShared.js` (`LeaveStatusBadge`, `LeaveTypeTag`, `LeaveBalanceCards`, `LeaveRequestTable`, `formatDays`, `dateRangeLabel`, `yearOptions`), `ApplyLeaveModal` (admin + self, live preview), `LeaveDecisionModal`.
- Employee detail Leave tab: `components/hrm/employees/detail/EmployeeLeaveTab.js`.
- HR Settings: new "Leave" section (`prorate_first_year`).
- Fixed the phase-1 employee list: its filters now live in an `hrm-filter-bar` above the table (the shared table freezes `AddButton` at first render). Departments/Designations/Holidays/Shifts only pass static buttons there, so they're fine.

## Gotchas found
- Media URLs on Windows contain backslashes (pre-existing; affects all medialibrary URLs).
- Files uploaded without a name are stored as `blob` (the UI always sends real file names).

# Phase 4: payroll

## Tables (migrations `2026_10_21_000014`–`000017`)
- `salary_components` (name, code, type `earning|deduction`, calculation `fixed|percent_of_basic`, default_value, epf_liable, taxable, is_active). Seeded: FXA Fixed Allowance (EPF liable), TRA Transport, MEA Meal, WEL Welfare (deduction).
- `employee_salary_components` (employee_id, salary_component_id, value nullable → component default, effective_from). Payroll uses the latest row per component with `effective_from` ≤ month end. Change an amount by adding a new row, not by editing.
- `employee_loans` (type `loan|advance`, amount, installments, monthly_installment, issued_date, start_month, balance, status `active|completed|cancelled`) + `loan_repayments` (payslip_id nullable for manual settlements).
- `payroll_runs` (month, warehouse_id/department_id scope or null = all, status `draft|approved|paid`, totals, approved_by/at, paid_date, expense_id) → `payslips` (employee snapshot, day counts, gross/deductions/net, EPF base, EPF 8/12, ETF 3) → `payslip_items` (type `earning|deduction|employer`, code, label, quantity, rate, amount, basis text, epf_liable, is_manual, links to component/loan).
- `employees.commission_percent`; hr_settings `commission_enabled` (0), `payroll_unmarked_as_absent` (1), `daily_wage_paid_holidays` (1), `payroll_prorate_joiners` (1).

## `App\Services\Hrm\PayrollService` (all payroll writes go through it)
- `createRun(month, warehouse?, department?)` → 422 if the same month + scope exists. `calculate(run)` (draft only) recalculates every in-scope active employee, keeps manual adjustments, and skips employees who already have a payslip in another run that month. `recalculatePayslip`, `addAdjustment` / `removeAdjustment` (manual lines), `approve` (locks the run, records loan repayments, lowers balances), `markPaid(run, date, createExpense)` (optional expense in the "Salaries" category), `deleteRun` (draft only).
- Money rules in `compute()`:
  - Monthly: basic pro-rated for joiners/leavers (setting). No-pay = basic ÷ `working_days_per_month` × (absent + unpaid leave days). Absent days leave out approved-leave days, and unmarked past working days count as absent when `payroll_unmarked_as_absent` is on.
  - Daily: rate × (worked days + paid leave + paid holidays when the setting is on).
  - OT = hours × hourly rate × multiplier (employee override → setting), only for `ot_eligible`. Late = minutes × hourly ÷ 60, if enabled (employee → setting).
  - Commission = % × completed (status 1) POS sales of the linked `user_id` in the month, by `sales.date`. Returns are NOT subtracted.
  - EPF base = basic after no-pay (daily: basic line) + EPF-liable earnings (including manual EPF-liable adjustments). EPF 8% employee / 12% employer, ETF 3% only when `epf_applicable`.
  - Round each line to 2 decimals. Never compute pay outside this service.
- `PayrollDocumentService`: `payslipPdf` (one or many payslips, `resources/views/pdf/payslip-pdf.blade.php`, logo embedded as a data URI from the local file, because HTTP to the single-threaded dev server would hang), `runSummaryExcel`, `bankSheetExcel`, `epfRows`/`epfExcel` (`App\Exports\PayrollArrayExport`).

## API (`routes/api.php`, block `// HRM phase 4: payroll`; `manage_payroll` unless noted)
- `salary-components` resource (delete refused when the component is used, so deactivate it instead). `GET employee-salary-components?employee_id=` → `{current, history}`; `POST {employee_id, items[{salary_component_id, value?, effective_from}]}`; `DELETE employee-salary-components/{id}`.
- `employee-loans` resource (update/delete only without repayments) + `POST {id}/settle {amount, date}`, `POST {id}/cancel`.
- `payroll-runs` index/store/show (`{run, payslips}`)/destroy + `POST {id}/recalculate|approve|pay {paid_date, create_expense}`, `GET {id}/pdf|summary-excel|bank-excel`.
- `payslips` index/show + `GET {id}/pdf`, `POST {id}/adjustments {type, label, amount, epf_liable}`, `DELETE {id}/adjustments/{itemId}`.
- `GET payroll-reports/epf?month=&warehouse_id=&include_draft=`, `GET payroll-reports/epf-excel`.
- Self service (`view_own_hr`): `GET my-payslips`, `my-payslips/{id}`, `my-payslips/{id}/pdf`. Only approved/paid runs are shown.

## Frontend
- Constants `apiBaseURL.SALARY_COMPONENTS|EMPLOYEE_SALARY_COMPONENTS|EMPLOYEE_LOANS|PAYROLL_RUNS|PAYSLIPS|PAYROLL_REPORTS|MY_PAYSLIPS`; `hrmActionType.FETCH_SALARY_COMPONENTS|FETCH_ALL_SALARY_COMPONENTS|FETCH_EMPLOYEE_LOANS|FETCH_PAYROLL_RUNS`.
- Actions `store/action/hrm/payrollActions.js`; reducers `store/reducers/payrollReducers.js` → `salaryComponents`, `allSalaryComponents`, `employeeLoans`, `payrollRuns`.
- Pages `components/hrm/payroll/`: `PayrollRuns` (/app/payroll-runs, `NewRunModal`), `PayrollRunDetail` (/app/payroll-runs/:id), `SalaryComponents`, `Loans` (/app/employee-loans), `PayrollReports` (EPF/ETF), `MyPayslips` (`view_own_hr`). Shared: `payrollShared.js` (`useMoney`, `PayrollStatusBadge`, `PayslipLines`, `PayslipDayFacts`, …), `PayslipModal` (view, adjust, download).
- Employee detail Payroll tab: `EmployeePayrollTab.js` (salary structure, loans, payslip history). The phase-1 placeholder tab was removed.
- HR Settings "Payroll" section; employee form `commission_percent`. Styles: `hrm-payslip-*`, `hrm-payroll-*` in `_hrm.scss`.
- `App.js` `mapPermissionToRoute`: `view_own_hr` now lands on `/app/my-attendance` (before, it went to the non-existent `/app/own`).

---

# Phase 5: HR dashboard and demo data

- **HR Dashboard** (`/app/hr-dashboard`, first item in the HRM menu, `manage_employees`): `GET hr-dashboard?warehouse_id=`
  (`HrDashboardAPIController`). It returns:
  - KPI tiles (active employees, present / late / on leave today, pending leave, this month's payroll).
  - A 30-day attendance trend and headcount by department and by branch.
  - Leave by type this month, via `LeaveService::monthSummary`, and payroll cost for the last 6 months, from payslips.
  - Lists: absent/late today, upcoming leave for the next 7 days, and pending approvals with approve/reject buttons that use the existing leave endpoints.
  - "Not marked" only appears after shift start + grace, so the list is empty early in the morning.
- **Demo data:** `php artisan hrm:demo-seed` (`App\Console\Commands\HrmDemoSeed`). It creates 15 `DEMO-###` employees, 4 departments, 8 designations, 2 shifts, Poya holidays, attendance from the start of last month to today, a leave year with 10 requests, salary structures, 2 loans, and last month's payroll run (approved, notes `[demo]`).
  - Run it once. `php artisan hrm:demo-seed --fresh` removes only what it created: `DEMO-` employees with all their records, the `[demo]` run, `(demo)` holidays and shifts, and `[demo]` departments/designations that are no longer used.
  - Today's attendance is only created for times that have already passed.

---

# How to use (first-time setup)

Do these steps in order the first time. Menu: **HRM** in the left sidebar.

1. **HR Settings** – check work start/end time, late grace minutes, OT rate (1.5), EPF 8% / 12%, ETF 3%,
   weekend days, Saturday half day, timezone (Asia/Colombo), and which attendance methods you use
   (POS auto clock-in, manual, fingerprint CSV import). Save.
2. **Departments** and **Designations** – add your departments (e.g. Sales, Store) and job titles (Cashier, Storekeeper).
3. **Employees** – add each staff member: personal details, branch, department, designation, joining date,
   salary type (monthly or daily) and basic salary, bank and EPF numbers.
   - To let a staff member use the POS, tick **Create login** (or link an existing user). Then the POS login
     clocks them in automatically.
   - Turn off **EPF applicable** for staff without EPF (for example daily workers).
4. **Shifts** – create your shifts (e.g. Day 08:30–17:30) and assign employees to them.
5. **Holidays** – add Poya days and public holidays for the year (several dates at once).
6. **Leave Types / Leave Balances** – check the leave types (Annual 14, Casual 7, Medical 7, No Pay),
   then press **Set up leave year** once each year. Change one person's leave days from their profile (Leave tab).
7. **Every day – Attendance** – staff clock in from the POS or "My Attendance", or mark the day on the
   **Attendance** page, or upload the fingerprint machine CSV. Approve leave in **Leave Requests**.
8. **Every month – Payroll Runs** – press **New run** for the month → check each payslip (add allowances or
   deductions if needed) → **Approve** → download payslips / bank sheet / EPF report → **Mark paid**
   (this can also add the salary expense).

Salary items (allowances and deductions) are set per employee on the employee's **Payroll** tab;
loans and advances are in **Loans & Advances** and are deducted automatically every month.
