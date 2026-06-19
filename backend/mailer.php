<?php
// ============================================================
// Mailer — uses Resend API (https://resend.com)
// Logs every attempt to backend/logs/email.log
// ============================================================

function smtp_send(string $to, string $toName, string $subject, string $htmlBody): void {
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    $logFile = $logDir . '/email.log';

    $ts = date('Y-m-d H:i:s');
    error_log("[$ts] EMAIL ATTEMPT | to=$to | subject=$subject");

    $apiKey = defined('RESEND_API_KEY') ? RESEND_API_KEY : '';
    if (!$apiKey || $apiKey === 're_YOUR_RESEND_API_KEY_HERE') {
        $msg = "[$ts] EMAIL SKIP | RESEND_API_KEY not configured | to=$to\n";
        file_put_contents($logFile, $msg, FILE_APPEND | LOCK_EX);
        error_log($msg);
        throw new RuntimeException('RESEND_API_KEY is not configured in config.php');
    }

    $fromName = defined('SMTP_FROM_NAME') ? SMTP_FROM_NAME : 'Bal-Balika Shibir';
    $fromAddr = 'registration@mtrc2026.site';

    $payload = json_encode([
        'from'    => "$fromName <$fromAddr>",
        'to'      => [$to],
        'subject' => $subject,
        'html'    => $htmlBody,
    ]);

    file_put_contents($logFile, "[$ts] SENDING | to=$to | from=$fromAddr | subject=$subject\n", FILE_APPEND | LOCK_EX);

    $ch = curl_init('https://api.resend.com/emails');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
        ],
    ]);

    $response  = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $logLine = "[$ts] RESULT | to=$to | http=$httpCode | curl_err=" . ($curlError ?: 'none') . " | resp=$response\n";
    file_put_contents($logFile, $logLine, FILE_APPEND | LOCK_EX);
    error_log($logLine);

    if ($curlError) {
        throw new RuntimeException("Resend curl error: $curlError");
    }

    if ($httpCode < 200 || $httpCode >= 300) {
        throw new RuntimeException("Resend API error (HTTP $httpCode): $response");
    }
}
