<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\AppBaseController;
use App\Models\SmsLog;
use App\Models\SmsSetting;
use App\Services\Sms\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class SmsSettingAPIController extends AppBaseController
{
    private const CUSTOM_KEYS = ['url', 'mobile_key', 'message_key', 'payload'];

    public function index(): JsonResponse
    {
        return $this->sendResponse($this->settingsPayload(), 'Sms Setting data retrieved successfully.');
    }

    public function update(Request $request): JsonResponse
    {
        $input = $request->all();
        $validator = Validator::make($input, [
            'provider' => 'required|in:'.SmsService::PROVIDER_SMSLENZ.','.SmsService::PROVIDER_CUSTOM,
            'sms_enabled' => 'required|boolean',
            'smslenz_user_id' => 'nullable|string|max:50',
            'smslenz_api_key' => 'nullable|string|max:255',
            'smslenz_sender_id' => 'nullable|string|max:50',
            'url' => 'nullable|string|max:500',
            'mobile_key' => 'nullable|string|max:100',
            'message_key' => 'nullable|string|max:100',
            'payload' => 'nullable|string|max:5000',
        ]);
        if ($validator->fails()) {
            throw new UnprocessableEntityHttpException($validator->errors()->first());
        }

        $current = SmsSetting::pluck('value', 'key');
        $enabled = filter_var($input['sms_enabled'], FILTER_VALIDATE_BOOLEAN);

        // a blank or masked key in the form means "keep the saved one"
        $apiKey = trim((string) ($input['smslenz_api_key'] ?? ''));
        $keepKey = $apiKey === '' || str_contains($apiKey, '•');
        $effectiveKey = $keepKey ? (string) ($current['smslenz_api_key'] ?? '') : $apiKey;

        if ($enabled && $input['provider'] === SmsService::PROVIDER_SMSLENZ) {
            if (trim((string) ($input['smslenz_user_id'] ?? '')) === '' || $effectiveKey === ''
                || trim((string) ($input['smslenz_sender_id'] ?? '')) === '') {
                throw new UnprocessableEntityHttpException('SMSlenz User ID, API Key and Sender ID are required to enable SMS.');
            }
        }
        $payload = trim((string) ($input['payload'] ?? ''));
        if ($input['provider'] === SmsService::PROVIDER_CUSTOM && $payload !== ''
            && ! is_array(json_decode(preg_replace('/\s/', '', $payload), true))) {
            throw new UnprocessableEntityHttpException('Payload must be valid JSON.');
        }

        $values = [
            'provider' => $input['provider'],
            'sms_enabled' => $enabled ? '1' : '0',
            'smslenz_user_id' => trim((string) ($input['smslenz_user_id'] ?? '')),
            'smslenz_sender_id' => trim((string) ($input['smslenz_sender_id'] ?? '')),
        ];
        if (! $keepKey) {
            $values['smslenz_api_key'] = $apiKey;
        }
        foreach (self::CUSTOM_KEYS as $key) {
            if (array_key_exists($key, $input)) {
                $values[$key] = (string) ($input[$key] ?? '');
            }
        }

        DB::transaction(function () use ($values) {
            foreach ($values as $key => $value) {
                SmsSetting::updateOrCreate(['key' => $key], ['value' => $value]);
            }
        });

        return $this->sendResponse($this->settingsPayload(), 'Sms Setting data updated successfully');
    }

    public function test(Request $request, SmsService $sms): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'to' => 'required|string|max:30',
            'message' => 'required|string|max:'.SmsService::MAX_LENGTH,
        ]);
        if ($validator->fails()) {
            throw new UnprocessableEntityHttpException($validator->errors()->first());
        }

        $result = $sms->send($request->get('to'), $request->get('message'), ['type' => 'test']);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['message'],
            'data' => $result,
        ], $result['success'] ? 200 : 422);
    }

    public function balance(SmsService $sms): JsonResponse
    {
        $result = $sms->accountStatus();

        return response()->json([
            'success' => $result['success'],
            'message' => $result['message'],
            'data' => $result['data'] ?? null,
        ], $result['success'] ? 200 : 422);
    }

    public function logs(Request $request): JsonResponse
    {
        $query = SmsLog::with('sender:id,first_name,last_name');

        if ($request->filled('log_status') && $request->get('log_status') !== '0') {
            $query->where('status', $request->get('log_status'));
        }
        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereDate('created_at', '>=', $request->get('start_date'))
                ->whereDate('created_at', '<=', $request->get('end_date'));
        }
        $search = $request->input('filter.search');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('to', 'like', '%'.$search.'%')
                    ->orWhere('message', 'like', '%'.$search.'%')
                    ->orWhere('error', 'like', '%'.$search.'%');
            });
        }
        $query->orderByDesc('id');

        $perPage = (int) getPageSize($request);
        $logs = $query->paginate($perPage > 0 ? $perPage : 10);

        return response()->json([
            'success' => true,
            'data' => collect($logs->items())->map(fn (SmsLog $log) => [
                'id' => $log->id,
                'to' => $log->to,
                'message' => $log->message,
                'provider' => $log->provider,
                'status' => $log->status,
                'pages' => $log->pages,
                'error' => $log->error,
                'context_type' => $log->context_type,
                'context_id' => $log->context_id,
                'sent_by' => $log->sender ? trim($log->sender->first_name.' '.$log->sender->last_name) : null,
                'created_at' => $log->created_at?->toDateTimeString(),
            ])->values(),
            'meta' => ['total' => $logs->total()],
            'message' => 'Sms logs retrieved successfully.',
        ]);
    }

    /** Settings for the UI; the API key itself is never returned. */
    private function settingsPayload(): array
    {
        $s = SmsSetting::pluck('value', 'key');
        $key = (string) ($s['smslenz_api_key'] ?? '');

        return [
            'provider' => (string) ($s['provider'] ?? SmsService::PROVIDER_SMSLENZ),
            'sms_enabled' => (string) ($s['sms_enabled'] ?? '0') === '1',
            'smslenz_user_id' => (string) ($s['smslenz_user_id'] ?? ''),
            'smslenz_sender_id' => (string) ($s['smslenz_sender_id'] ?? 'SMSlenzDEMO'),
            'smslenz_api_key_set' => $key !== '',
            'smslenz_api_key_masked' => $key !== '' ? '••••'.substr($key, -4) : '',
            'url' => (string) ($s['url'] ?? ''),
            'mobile_key' => (string) ($s['mobile_key'] ?? ''),
            'message_key' => (string) ($s['message_key'] ?? ''),
            'payload' => (string) ($s['payload'] ?? ''),
        ];
    }
}
