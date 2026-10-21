<?php

namespace App\Models;

use App\Models\Contracts\JsonResourceful;
use App\Traits\HasJsonResourcefulData;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $name
 * @property string $type
 * @property bool $is_paid
 * @property int|null $warehouse_id
 */
class Holiday extends BaseModel implements JsonResourceful
{
    use HasFactory, HasJsonResourcefulData;

    protected $table = 'holidays';

    const JSON_API_TYPE = 'holidays';

    const TYPES = ['poya', 'public', 'mercantile', 'company'];

    protected $fillable = [
        'name',
        'date',
        'type',
        'is_paid',
        'warehouse_id',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'is_paid' => 'boolean',
    ];

    public static $rules = [
        'name' => 'required|max:191',
        'date' => 'required|date',
        'type' => 'required|in:poya,public,mercantile,company',
        'is_paid' => 'nullable|boolean',
        'warehouse_id' => 'nullable|exists:warehouses,id',
    ];

    public function prepareLinks(): array
    {
        return [
            'self' => route('holidays.show', $this->id),
        ];
    }

    public function prepareAttributes(): array
    {
        return [
            'name' => $this->name,
            'date' => optional($this->date)->format('Y-m-d'),
            'day_name' => optional($this->date)->format('l'),
            'type' => $this->type,
            'is_paid' => $this->is_paid,
            'warehouse_id' => $this->warehouse_id,
            'branch_name' => $this->warehouse ? $this->warehouse->name : null,
            'created_at' => $this->created_at,
        ];
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    /**
     * Holidays that apply to a branch on a date (branch-specific or all branches).
     */
    public function scopeForBranchOn($query, ?int $warehouseId, string $date)
    {
        return $query->whereDate('date', $date)->where(function ($q) use ($warehouseId) {
            $q->whereNull('warehouse_id');
            if ($warehouseId) {
                $q->orWhere('warehouse_id', $warehouseId);
            }
        });
    }
}
