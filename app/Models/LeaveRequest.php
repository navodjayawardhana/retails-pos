<?php

namespace App\Models;

use App\Models\Contracts\JsonResourceful;
use App\Traits\HasJsonResourcefulData;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * @property int $id
 * @property int $employee_id
 * @property int $leave_type_id
 * @property \Carbon\Carbon $from_date
 * @property \Carbon\Carbon $to_date
 * @property bool $is_half_day
 * @property string|null $half_session
 * @property float $days
 * @property string $status
 * @property array|null $marked_dates
 * @property array|null $conflict_dates
 */
class LeaveRequest extends BaseModel implements HasMedia, JsonResourceful
{
    use HasFactory, InteractsWithMedia, HasJsonResourcefulData;

    protected $table = 'leave_requests';

    const JSON_API_TYPE = 'leave_requests';

    public const ATTACHMENT_PATH = 'leave_attachments';

    const STATUS_PENDING = 'pending';

    const STATUS_APPROVED = 'approved';

    const STATUS_REJECTED = 'rejected';

    const STATUS_CANCELLED = 'cancelled';

    const STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

    protected $fillable = [
        'employee_id',
        'leave_type_id',
        'from_date',
        'to_date',
        'is_half_day',
        'half_session',
        'days',
        'reason',
        'status',
        'approved_by',
        'approved_at',
        'remarks',
        'marked_dates',
        'conflict_dates',
        'created_by',
    ];

    protected $casts = [
        'from_date' => 'date:Y-m-d',
        'to_date' => 'date:Y-m-d',
        'is_half_day' => 'boolean',
        'days' => 'float',
        'approved_at' => 'datetime',
        'marked_dates' => 'array',
        'conflict_dates' => 'array',
    ];

    public function prepareLinks(): array
    {
        return [
            'self' => route('leave-requests.show', $this->id),
        ];
    }

    public function prepareAttributes(): array
    {
        $employee = $this->employee;
        $type = $this->leaveType;

        return [
            'employee_id' => $this->employee_id,
            'employee_code' => $employee ? $employee->employee_code : null,
            'employee_name' => $employee ? $employee->full_name : null,
            'branch_name' => $employee && $employee->warehouse ? $employee->warehouse->name : null,
            'department_name' => $employee && $employee->department ? $employee->department->name : null,
            'leave_type_id' => $this->leave_type_id,
            'leave_type_name' => $type ? $type->name : null,
            'leave_type_code' => $type ? $type->code : null,
            'leave_type_color' => $type ? $type->color : null,
            'is_paid' => $type ? $type->is_paid : null,
            'from_date' => optional($this->from_date)->format('Y-m-d'),
            'to_date' => optional($this->to_date)->format('Y-m-d'),
            'is_half_day' => $this->is_half_day,
            'half_session' => $this->half_session,
            'days' => $this->days,
            'reason' => $this->reason,
            'status' => $this->status,
            'approved_by' => $this->approved_by,
            'approver_name' => $this->approver ? trim($this->approver->first_name.' '.$this->approver->last_name) : null,
            'approved_at' => optional($this->approved_at)->format('Y-m-d H:i'),
            'remarks' => $this->remarks,
            'marked_dates' => $this->marked_dates ?: [],
            'conflict_dates' => $this->conflict_dates ?: [],
            'attachments' => $this->attachmentsList(),
            'created_at' => $this->created_at,
        ];
    }

    public function attachmentsList(): array
    {
        return $this->getMedia(self::ATTACHMENT_PATH)->map(function (Media $media) {
            return [
                'id' => $media->id,
                'name' => $media->file_name,
                'mime_type' => $media->mime_type,
                'url' => $media->getFullUrl(),
            ];
        })->values()->toArray();
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Requests whose date range touches [$from, $to].
     */
    public function scopeOverlapping($query, string $from, string $to)
    {
        return $query->whereDate('from_date', '<=', $to)->whereDate('to_date', '>=', $from);
    }
}
