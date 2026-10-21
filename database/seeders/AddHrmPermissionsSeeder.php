<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class AddHrmPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['name' => 'manage_employees', 'display_name' => 'Manage Employees'],
            ['name' => 'manage_departments', 'display_name' => 'Manage Departments & Designations'],
            ['name' => 'manage_hr_settings', 'display_name' => 'Manage HR Settings'],
            ['name' => 'manage_attendance', 'display_name' => 'Manage Attendance'],
            ['name' => 'manage_leave', 'display_name' => 'Manage Leave'],
            ['name' => 'manage_payroll', 'display_name' => 'Manage Payroll'],
            ['name' => 'view_own_hr', 'display_name' => 'View Own HR (Attendance, Leave, Payslips)'],
        ];

        foreach ($permissions as $permission) {
            if (! Permission::whereName($permission['name'])->exists()) {
                Permission::create($permission);
            }
        }

        /** @var Role $adminRole */
        $adminRole = Role::whereName(Role::ADMIN)->first();
        if (empty($adminRole)) {
            $adminRole = Role::create(['name' => 'admin', 'display_name' => ' Admin']);
        }

        $adminRole->syncPermissions(Permission::pluck('name', 'id'));
    }
}
