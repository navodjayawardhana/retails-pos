<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SmsLog extends Model
{
    public const STATUS_SENT = 'sent';

    public const STATUS_FAILED = 'failed';

    public const STATUS_SKIPPED = 'skipped';

    protected $table = 'sms_logs';

    protected $fillable = [
        'to',
        'message',
        'provider',
        'status',
        'pages',
        'campaign_id',
        'error',
        'response',
        'context_type',
        'context_id',
        'sent_by',
    ];

    protected $casts = [
        'response' => 'array',
        'pages' => 'integer',
        'context_id' => 'integer',
        'sent_by' => 'integer',
    ];

    public function sender()
    {
        return $this->belongsTo(User::class, 'sent_by');
    }
}
