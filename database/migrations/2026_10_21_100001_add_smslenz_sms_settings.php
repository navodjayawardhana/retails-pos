<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $existing = DB::table('sms_settings')->pluck('value', 'key');

        // Enable SMS only if the legacy custom gateway looks really configured
        // (the install ships with a test.com placeholder and an empty payload).
        $url = (string) ($existing['url'] ?? '');
        $payload = trim((string) ($existing['payload'] ?? ''));
        $customConfigured = $url !== '' && ! str_contains($url, 'test.com') && $payload !== '';

        $defaults = [
            'sms_enabled' => $customConfigured ? '1' : '0',
            'provider' => $customConfigured ? 'custom' : 'smslenz',
            'smslenz_user_id' => '',
            'smslenz_api_key' => '',
            'smslenz_sender_id' => 'SMSlenzDEMO',
        ];

        foreach ($defaults as $key => $value) {
            if (! $existing->has($key)) {
                DB::table('sms_settings')->insert([
                    'key' => $key,
                    'value' => $value,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        DB::table('sms_settings')->whereIn('key', [
            'sms_enabled', 'provider', 'smslenz_user_id', 'smslenz_api_key', 'smslenz_sender_id',
        ])->delete();
    }
};
