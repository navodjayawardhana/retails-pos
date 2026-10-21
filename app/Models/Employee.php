<?php

namespace App\Models;

use App\Models\Contracts\JsonResourceful;
use App\Traits\HasJsonResourcefulData;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * @property int $id
 * @property string $employee_code
 * @property string $first_name
 * @property string|null $last_name
 * @property int|null $warehouse_id
 * @property int|null $department_id
 * @property int|null $designation_id
 * @property int|null $user_id
 * @property string $salary_type
 * @property float $basic_salary
 * @property string $status
 */
class Employee extends BaseModel implements HasMedia, JsonResourceful
{
    use HasFactory, InteractsWithMedia, HasJsonResourcefulData;

    protected $table = 'employees';

    const JSON_API_TYPE = 'employees';

    public const PHOTO_PATH = 'employee_photo';

    public const DOCUMENT_PATH = 'employee_documents';

    public const CODE_PREFIX = 'EMP-';

    const STATUS_ACTIVE = 'active';

    const STATUS_RESIGNED = 'resigned';

    const STATUS_TERMINATED = 'terminated';

    protected $fillable = [
        'employee_code',
        'first_name',
        'last_name',
        'nic',
        'dob',
        'gender',
        'phone',
        'email',
        'address',
        'city',
        'warehouse_id',
        'department_id',
        'designation_id',
        'user_id',
        'joining_date',
        'employment_type',
        'salary_type',
        'basic_salary',
        'ot_eligible',
        'ot_rate_multiplier',
        'late_deduction_enabled',
        'work_start',
        'work_end',
        'epf_applicable',
        'commission_percent',
        'bank_name',
        'bank_branch',
        'bank_account_no',
        'epf_no',
        'etf_no',
        'emergency_contact_name',
        'emergency_contact_phone',
        'status',
        'leaving_date',
        'notes',
    ];

    protected $casts = [
        'basic_salary' => 'float',
        'ot_eligible' => 'boolean',
        'ot_rate_multiplier' => 'float',
        'late_deduction_enabled' => 'boolean',
        'epf_applicable' => 'boolean',
        'commission_percent' => 'float',
        'dob' => 'date:Y-m-d',
        'joining_date' => 'date:Y-m-d',
        'leaving_date' => 'date:Y-m-d',
    ];

    public static $rules = [
        'first_name' => 'required|max:191',
        'last_name' => 'nullable|max:191',
        'nic' => 'nullable|max:20|unique:employees,nic',
        'dob' => 'nullable|date',
        'gender' => 'nullable|in:male,female,other',
        'phone' => 'nullable|max:30',
        'email' => 'nullable|email|max:191',
        'address' => 'nullable|max:1000',
        'city' => 'nullable|max:191',
        'warehouse_id' => 'nullable|exists:warehouses,id',
        'department_id' => 'nullable|exists:departments,id',
        'designation_id' => 'nullable|exists:designations,id',
        'user_id' => 'nullable|exists:users,id|unique:employees,user_id',
        'joining_date' => 'nullable|date',
        'employment_type' => 'required|in:permanent,contract,probation,daily',
        'salary_type' => 'required|in:monthly,daily',
        'basic_salary' => 'required|numeric|min:0',
        'ot_eligible' => 'nullable|boolean',
        'ot_rate_multiplier' => 'nullable|numeric|min:0|max:10',
        'late_deduction_enabled' => 'nullable|boolean',
        'work_start' => 'nullable|date_format:H:i',
        'work_end' => 'nullable|date_format:H:i',
        'epf_applicable' => 'nullable|boolean',
        'commission_percent' => 'nullable|numeric|min:0|max:100',
        'bank_name' => 'nullable|max:191',
        'bank_branch' => 'nullable|max:191',
        'bank_account_no' => 'nullable|max:50',
        'epf_no' => 'nullable|max:50',
        'etf_no' => 'nullable|max:50',
        'emergency_contact_name' => 'nullable|max:191',
        'emergency_contact_phone' => 'nullable|max:30',
        'status' => 'required|in:active,resigned,terminated',
        'leaving_date' => 'nullable|date',
        'notes' => 'nullable|max:2000',
        'photo' => 'nullable|image|mimes:jpg,jpeg,png|max:4096',
    ];

    public static function generateCode(): string
    {
        $last = static::where('employee_code', 'like', static::CODE_PREFIX.'%')
            ->orderByRaw('CAST(SUBSTRING(employee_code, '.(strlen(static::CODE_PREFIX) + 1).') AS UNSIGNED) DESC')
            ->value('employee_code');
        $next = $last ? ((int) substr($last, strlen(static::CODE_PREFIX))) + 1 : 1;

        return static::CODE_PREFIX.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }

    public function getFullNameAttribute(): string
    {
        return trim($this->first_name.' '.$this->last_name);
    }

    public function getPhotoUrlAttribute(): string
    {
        /** @var Media $media */
        $media = $this->getMedia(self::PHOTO_PATH)->first();

        return $media ? $media->getFullUrl() : '';
    }

    public function getDocumentsList(): array
    {
        return $this->getMedia(self::DOCUMENT_PATH)->map(function (Media $media) {
            return [
                'id' => $media->id,
                'name' => $media->getCustomProperty('title') ?: $media->file_name,
                'file_name' => $media->file_name,
                'mime_type' => $media->mime_type,
                'size' => $media->size,
                'url' => $media->getFullUrl(),
                'created_at' => $media->created_at,
            ];
        })->values()->toArray();
    }

    public function prepareLinks(): array
    {
        return [
            'self' => route('employees.show', $this->id),
        ];
    }

    public function prepareAttributes(): array
    {
        return [
            'employee_code' => $this->employee_code,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'nic' => $this->nic,
            'dob' => optional($this->dob)->format('Y-m-d'),
            'gender' => $this->gender,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'city' => $this->city,
            'warehouse_id' => $this->warehouse_id,
            'branch_name' => $this->warehouse ? $this->warehouse->name : null,
            'department_id' => $this->department_id,
            'department_name' => $this->department ? $this->department->name : null,
            'designation_id' => $this->designation_id,
            'designation_name' => $this->designation ? $this->designation->name : null,
            'user_id' => $this->user_id,
            'user' => $this->user ? [
                'id' => $this->user->id,
                'name' => trim($this->user->first_name.' '.$this->user->last_name),
                'email' => $this->user->email,
                'role' => optional($this->user->roles->first())->name,
            ] : null,
            'joining_date' => optional($this->joining_date)->format('Y-m-d'),
            'employment_type' => $this->employment_type,
            'salary_type' => $this->salary_type,
            'basic_salary' => $this->basic_salary,
            'ot_eligible' => $this->ot_eligible,
            'ot_rate_multiplier' => $this->ot_rate_multiplier,
            'late_deduction_enabled' => $this->late_deduction_enabled,
            'work_start' => $this->work_start ? substr($this->work_start, 0, 5) : null,
            'work_end' => $this->work_end ? substr($this->work_end, 0, 5) : null,
            'epf_applicable' => $this->epf_applicable,
            'commission_percent' => $this->commission_percent,
            'bank_name' => $this->bank_name,
            'bank_branch' => $this->bank_branch,
            'bank_account_no' => $this->bank_account_no,
            'epf_no' => $this->epf_no,
            'etf_no' => $this->etf_no,
            'emergency_contact_name' => $this->emergency_contact_name,
            'emergency_contact_phone' => $this->emergency_contact_phone,
            'status' => $this->status,
            'leaving_date' => optional($this->leaving_date)->format('Y-m-d'),
            'notes' => $this->notes,
            'photo_url' => $this->photo_url,
            'documents' => $this->getDocumentsList(),
            'created_at' => $this->created_at,
        ];
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function designation(): BelongsTo
    {
        return $this->belongsTo(Designation::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function employeeShifts(): HasMany
    {
        return $this->hasMany(EmployeeShift::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function leaveEntitlements(): HasMany
    {
        return $this->hasMany(LeaveEntitlement::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function salaryComponents(): HasMany
    {
        return $this->hasMany(EmployeeSalaryComponent::class);
    }

    public function loans(): HasMany
    {
        return $this->hasMany(EmployeeLoan::class);
    }

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }
}
