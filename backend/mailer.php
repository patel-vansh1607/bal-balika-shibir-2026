<?php
// ============================================================
// Lightweight SMTP mailer — SSL port 465, no Composer needed
// ============================================================

function smtp_send(string $to, string $toName, string $subject, string $htmlBody): void {
    $host     = SMTP_HOST;
    $port     = SMTP_PORT;
    $username = SMTP_USER;
    $password = SMTP_PASS;
    $fromAddr = SMTP_USER;
    $fromName = SMTP_FROM_NAME;

    $socket = @fsockopen("ssl://$host", $port, $errno, $errstr, 15);
    if (!$socket) {
        throw new RuntimeException("SMTP connect failed ($errno): $errstr");
    }

    $read = function() use ($socket) {
        $resp = '';
        while ($line = fgets($socket, 512)) {
            $resp .= $line;
            if ($line[3] === ' ') break;
        }
        return $resp;
    };

    $cmd = function(string $c) use ($socket, $read) {
        fwrite($socket, $c . "\r\n");
        return $read();
    };

    $read(); // 220 greeting

    $domain = explode('@', $username)[1] ?? 'localhost';
    $cmd("EHLO $domain");
    $cmd("AUTH LOGIN");
    $cmd(base64_encode($username));
    $r = $cmd(base64_encode($password));
    if (strpos($r, '235') === false) {
        fclose($socket);
        throw new RuntimeException("SMTP auth failed: $r");
    }

    $cmd("MAIL FROM:<$fromAddr>");
    $cmd("RCPT TO:<$to>");
    $cmd("DATA");

    $boundary = md5(uniqid());
    $headers  = implode("\r\n", [
        "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <$fromAddr>",
        "To: =?UTF-8?B?" . base64_encode($toName) . "?= <$to>",
        "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=",
        "MIME-Version: 1.0",
        "Content-Type: multipart/alternative; boundary=\"$boundary\"",
        "X-Mailer: Bal-Balika-Shibir-2026",
    ]);

    $plainText = strip_tags(preg_replace('/<br\s*\/?>/', "\n", $htmlBody));

    $body = "$headers\r\n\r\n"
        . "--$boundary\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($plainText)) . "\r\n"
        . "--$boundary\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($htmlBody)) . "\r\n"
        . "--$boundary--";

    fwrite($socket, $body . "\r\n.\r\n");
    $r = $read();
    $cmd("QUIT");
    fclose($socket);

    if (strpos($r, '250') === false) {
        throw new RuntimeException("SMTP DATA rejected: $r");
    }
}
