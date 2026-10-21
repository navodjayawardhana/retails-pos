<?php

namespace App\Services\Sms;

use App\Models\SmsLog;
use App\Models\SmsSetting;
use App\Models\SmsTemplate;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Sends SMS through the configured provider and records every attempt in sms_logs.
 * Never throws: callers (sale/return flows) must not fail because an SMS failed.
 */
class SmsService
{
    public const PROVIDER_SMSLENZ = 'smslenz';

    public const PROVIDER_CUSTOM = 'custom';

    public const MAX_LENGTH = 1500;

    private const SMSLENZ_BASE = 'https://smslenz.lk/api/';

    private ?array $settings = null;

    public function setting(string $key, $default = null)
    {
        if ($this->settings === null) {
            $this->settings = SmsSetting::pluck('value', 'key')->toArray();
        }

        return $this->settings[$key] ?? $default;
    }

    public function isEnabled(): bool
    {
        return (string) $this->setting('sms_enabled', '0') === '1';
    }

    public function provider(): string
    {
        $provider = (string) $this->setting('provider', self::PROVIDER_SMSLENZ);

        return in_array($provider, [self::PROVIDER_SMSLENZ, self::PROVIDER_CUSTOM], true)
            ? $provider
            : self::PROVIDER_SMSLENZ;
    }

    /**
     * Sri Lankan numbers to +94XXXXXXXXX. Accepts 0771234567, 771234567, 94771234567,
     * +94 77 123 4567, 0094771234567. Returns null when it isn't a valid 9-digit SL number.
     */
    public static function normalizeNumber(?string $number): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $number);
        if ($digits === '') {
            return null;
        }
        if (str_starts_with($digits, '0094')) {
            $digits = substr($digits, 4);
        } elseif (str_starts_with($digits, '94') && strlen($digits) === 11) {
            $digits = substr($digits, 2);
        } elseif (str_starts_with($digits, '0') && strlen($digits) === 10) {
            $digits = substr($digits, 1);
        }

        if (strlen($digits) !== 9 || $digits[0] === '0') {
            return null;
        }

        return '+94'.$digits;
    }

    /**
     * Send one SMS through the active provider. $context: ['type' => 'sale', 'id' => 12].
     *
     * @return array{success: bool, status: string, message: string, data?: array}
     */
    public function send(string $to, string $message, array $context = []): array
    {
        $provider = $this->provider();
        $message = mb_substr(trim($message), 0, self::MAX_LENGTH);

        if ($message === '') {
            return $this->finish($provider, $to, $message, SmsLog::STATUS_SKIPPED, 'Empty message', $context);
        }

        if ($provider === self::PROVIDER_SMSLENZ) {
            $normalized = self::normalizeNumber($to);
            if (! $normalized) {
                return $this->finish($provider, $to, $message, SmsLog::STATUS_SKIPPED, 'Invalid Sri Lankan phone number', $context);
            }

            return $this->sendViaSmslenz($normalized, $message, $context);
        }

        if (trim($to) === '') {
            return $this->finish($provider, $to, $message, SmsLog::STATUS_SKIPPED, 'No phone number', $context);
        }

        return $this->sendViaCustom($to, $message, $context);
    }

    /**
     * Fill an SMS template and send it, only when SMS is enabled and the template is active.
     *
     * @param  array<string, string>  $replacements  e.g. ['{customer_name}' => 'Nimal']
     */
    public function sendTemplate(int $type, ?string $to, array $replacements, array $context = []): ?array
    {
        $template = SmsTemplate::where('type', $type)->first();
        if (empty($template) || $template->status != SmsTemplate::ACTIVE || ! $this->isEnabled()) {
            return null;
        }

        $message = str_replace(array_keys($replacements), array_values($replacements), $template->content);

        return $this->send((string) $to, $message, $context);
    }

    public function accountStatus(): array
    {
        if ($this->provider() !== self::PROVIDER_SMSLENZ) {
            return ['success' => false, 'message' => 'Balance check is only available for SMSlenz.'];
        }
        if (! $this->smslenzConfigured()) {
            return ['success' => false, 'message' => 'SMSlenz User ID and API Key are not set.'];
        }

        try {
            $response = $this->http()->post(self::SMSLENZ_BASE.'account-status', $this->smslenzAuth());
            $json = $response->json() ?? [];

            if ($response->successful() && ($json['success'] ?? false)) {
                return ['success' => true, 'message' => $json['message'] ?? 'OK', 'data' => $json['data'] ?? []];
            }

            return ['success' => false, 'message' => $this->errorMessage($response->status(), $json)];
        } catch (Throwable $e) {
            Log::warning('SMSlenz account status failed: '.$e->getMessage());

            return ['success' => false, 'message' => $this->exceptionMessage($e)];
        }
    }

    private function sendViaSmslenz(string $to, string $message, array $context): array
    {
        if (! $this->smslenzConfigured()) {
            return $this->finish(self::PROVIDER_SMSLENZ, $to, $message, SmsLog::STATUS_FAILED, 'SMSlenz User ID and API Key are not set.', $context);
        }

        try {
            $response = $this->http()->post(self::SMSLENZ_BASE.'send-sms', $this->smslenzAuth() + [
                'sender_id' => (string) $this->setting('smslenz_sender_id', 'SMSlenzDEMO'),
                'contact' => $to,
                'message' => $message,
            ]);
            $json = $response->json() ?? [];

            if ($response->successful() && ($json['success'] ?? false)) {
                $data = $json['data'] ?? [];

                return $this->finish(self::PROVIDER_SMSLENZ, $to, $message, SmsLog::STATUS_SENT, null, $context, $json, [
                    'pages' => $data['pages'] ?? null,
                    'campaign_id' => isset($data['campaign_id']) ? (string) $data['campaign_id'] : null,
                ]);
            }

            $error = $this->errorMessage($response->status(), $json);
            Log::warning('SMSlenz send failed', ['status' => $response->status(), 'error' => $error, 'to' => $to]);

            return $this->finish(self::PROVIDER_SMSLENZ, $to, $message, SmsLog::STATUS_FAILED, $error, $context, $json ?: ['http_status' => $response->status()]);
        } catch (Throwable $e) {
            Log::warning('SMSlenz send exception: '.$e->getMessage(), ['to' => $to]);

            return $this->finish(self::PROVIDER_SMSLENZ, $to, $message, SmsLog::STATUS_FAILED, $this->exceptionMessage($e), $context);
        }
    }

    /** The original generic gateway: url + JSON payload with mobile/message keys replaced. */
    private function sendViaCustom(string $to, string $message, array $context): array
    {
        try {
            $url = (string) $this->setting('url', '');
            $payload = json_decode(preg_replace('/\s/', '', (string) $this->setting('payload', '')), true);
            if ($url === '' || ! is_array($payload)) {
                return $this->finish(self::PROVIDER_CUSTOM, $to, $message, SmsLog::STATUS_FAILED, 'Custom gateway URL or payload is not set.', $context);
            }

            $payload = replaceArrayValue($payload, $this->setting('mobile_key'), $to);
            $payload = replaceArrayValue($payload, $this->setting('message_key'), $message);

            $response = $this->http()
                ->withHeaders(['Content-Type' => 'application/json', 'Accept' => 'application/json'])
                ->send('POST', $url, ['form_params' => [$payload]]);

            $body = ['http_status' => $response->status(), 'body' => mb_substr((string) $response->body(), 0, 2000)];

            if ($response->successful()) {
                return $this->finish(self::PROVIDER_CUSTOM, $to, $message, SmsLog::STATUS_SENT, null, $context, $body);
            }

            return $this->finish(self::PROVIDER_CUSTOM, $to, $message, SmsLog::STATUS_FAILED, 'Gateway returned HTTP '.$response->status(), $context, $body);
        } catch (Throwable $e) {
            Log::warning('Custom SMS gateway exception: '.$e->getMessage(), ['to' => $to]);

            return $this->finish(self::PROVIDER_CUSTOM, $to, $message, SmsLog::STATUS_FAILED, $this->exceptionMessage($e), $context);
        }
    }

    private function http()
    {
        return Http::connectTimeout(5)->timeout(15)->acceptJson()->asForm();
    }

    private function smslenzConfigured(): bool
    {
        return trim((string) $this->setting('smslenz_user_id', '')) !== ''
            && trim((string) $this->setting('smslenz_api_key', '')) !== '';
    }

    private function smslenzAuth(): array
    {
        return [
            'user_id' => trim((string) $this->setting('smslenz_user_id')),
            'api_key' => trim((string) $this->setting('smslenz_api_key')),
        ];
    }

    private function errorMessage(int $status, array $json): string
    {
        $fromApi = $json['message'] ?? null;
        $default = [
            401 => 'Invalid SMSlenz API key or user ID.',
            403 => 'SMSlenz account is suspended.',
            422 => 'SMSlenz rejected the request.',
            429 => 'SMSlenz rate limit exceeded. Try again shortly.',
        ][$status] ?? 'SMS gateway returned HTTP '.$status.'.';

        return $fromApi ? $fromApi.($status >= 400 ? " (HTTP {$status})" : '') : $default;
    }

    private function exceptionMessage(Throwable $e): string
    {
        return $e instanceof ConnectionException
            ? 'Could not reach the SMS gateway (timeout or no connection).'
            : 'SMS sending failed: '.$e->getMessage();
    }

    private function finish(string $provider, string $to, string $message, string $status, ?string $error, array $context, ?array $response = null, array $extra = []): array
    {
        try {
            SmsLog::create([
                'to' => mb_substr($to, 0, 40),
                'message' => $message,
                'provider' => $provider,
                'status' => $status,
                'pages' => $extra['pages'] ?? null,
                'campaign_id' => $extra['campaign_id'] ?? null,
                'error' => $error,
                'response' => $response,
                'context_type' => $context['type'] ?? null,
                'context_id' => $context['id'] ?? null,
                'sent_by' => Auth::id(),
            ]);
        } catch (Throwable $e) {
            Log::warning('Could not write sms_logs row: '.$e->getMessage());
        }

        return [
            'success' => $status === SmsLog::STATUS_SENT,
            'status' => $status,
            'message' => $status === SmsLog::STATUS_SENT ? 'SMS sent successfully.' : ($error ?? 'SMS not sent.'),
            'data' => $response['data'] ?? null,
        ];
    }
}
