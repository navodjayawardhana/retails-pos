<?php

namespace App\Repositories;

use App\Models\Employee;
use App\Models\User;
use Exception;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class EmployeeRepository extends BaseRepository
{
    protected $fieldSearchable = [
        'employee_code',
        'first_name',
        'last_name',
        'nic',
        'phone',
        'email',
        'status',
        'joining_date',
        'created_at',
    ];

    public function getFieldsSearchable(): array
    {
        return $this->fieldSearchable;
    }

    public function model()
    {
        return Employee::class;
    }

    /**
     * Create an employee. When create_login is set, a system user is created through
     * the existing UserRepository::storeUser path (same rules + role assignment) and linked.
     */
    public function storeEmployee(array $input): Employee
    {
        try {
            DB::beginTransaction();
            $input = $this->normalise($input);

            if (! empty($input['create_login'])) {
                $input['user_id'] = $this->createLogin($input)->id;
            }

            $input['employee_code'] = Employee::generateCode();
            /** @var Employee $employee */
            $employee = Employee::create(Arr::only($input, (new Employee())->getFillable()));

            if (! empty($input['photo'])) {
                $employee->addMedia($input['photo'])->toMediaCollection(Employee::PHOTO_PATH, config('app.image_disk'));
            }

            DB::commit();

            return $employee->fresh();
        } catch (UnprocessableEntityHttpException $e) {
            DB::rollBack();
            throw $e;
        } catch (Exception $e) {
            DB::rollBack();
            throw new UnprocessableEntityHttpException($e->getMessage());
        }
    }

    public function updateEmployee(array $input, int $id): Employee
    {
        try {
            DB::beginTransaction();
            /** @var Employee $employee */
            $employee = Employee::findOrFail($id);
            $input = $this->normalise($input);

            if (! empty($input['create_login'])) {
                if ($employee->user_id) {
                    throw new UnprocessableEntityHttpException('This employee is already linked to a login.');
                }
                $input['user_id'] = $this->createLogin($input)->id;
            }

            $employee->update(Arr::only($input, Arr::except($employee->getFillable(), ['employee_code'])));

            if (! empty($input['photo'])) {
                $employee->clearMediaCollection(Employee::PHOTO_PATH);
                $employee->addMedia($input['photo'])->toMediaCollection(Employee::PHOTO_PATH, config('app.image_disk'));
            }

            DB::commit();

            return $employee->fresh();
        } catch (UnprocessableEntityHttpException $e) {
            DB::rollBack();
            throw $e;
        } catch (Exception $e) {
            DB::rollBack();
            throw new UnprocessableEntityHttpException($e->getMessage());
        }
    }

    public function addDocument(Employee $employee, $file, ?string $title = null): void
    {
        $adder = $employee->addMedia($file);
        if ($title) {
            $adder->withCustomProperties(['title' => $title]);
        }
        $adder->toMediaCollection(Employee::DOCUMENT_PATH, config('app.image_disk'));
    }

    /**
     * Users not linked to any employee (optionally keeping the one already linked to $employeeId).
     */
    public function availableUsers(?int $employeeId = null)
    {
        $linked = Employee::whereNotNull('user_id')
            ->when($employeeId, fn ($q) => $q->where('id', '!=', $employeeId))
            ->pluck('user_id');

        return User::whereNotIn('id', $linked)->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'email', 'phone']);
    }

    private function createLogin(array $input): User
    {
        $userInput = [
            'first_name' => $input['first_name'] ?? null,
            'last_name' => $input['last_name'] ?? ($input['first_name'] ?? null),
            'email' => $input['login_email'] ?? ($input['email'] ?? null),
            'phone' => preg_replace('/\D/', '', $input['phone'] ?? ''),
            'password' => $input['login_password'] ?? null,
            'confirm_password' => $input['login_password'] ?? null,
            'role_id' => $input['login_role_id'] ?? null,
        ];

        $rules = User::$rules;
        unset($rules['image']);
        $rules['role_id'] = 'required|exists:roles,id';
        $validator = Validator::make($userInput, $rules, [
            'phone.required' => 'A phone number is required to create a login.',
            'role_id.required' => 'Select a role for the login.',
        ]);
        if ($validator->fails()) {
            throw new UnprocessableEntityHttpException($validator->errors()->first());
        }

        return app(UserRepository::class)->storeUser($userInput);
    }

    /**
     * Multipart/form values arrive as strings: convert empties to null and booleans to ints.
     */
    private function normalise(array $input): array
    {
        foreach ($input as $key => $value) {
            if ($value === '' || $value === 'null' || $value === 'undefined') {
                $input[$key] = null;
            }
        }
        foreach (['ot_eligible', 'epf_applicable', 'create_login'] as $key) {
            if (array_key_exists($key, $input) && $input[$key] !== null) {
                $input[$key] = filter_var($input[$key], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
            }
        }
        if (array_key_exists('late_deduction_enabled', $input) && $input['late_deduction_enabled'] !== null) {
            $input['late_deduction_enabled'] = filter_var($input['late_deduction_enabled'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
        }

        return $input;
    }
}
