<?php
// ============================================================
// PDO database connection (singleton)
// ============================================================

function get_db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

// Format attendees.id (INT) as zero-padded 4-char string
function fmt_attendee_id(int $id): string {
    return str_pad((string)$id, 4, '0', STR_PAD_LEFT);
}

// Decode JSON columns that may come back as strings
function decode_json_col(mixed $val): array {
    if (is_array($val)) return $val;
    if (is_string($val)) return json_decode($val, true) ?? [];
    return [];
}

// Generate a UUID v4
function generate_uuid(): string {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
