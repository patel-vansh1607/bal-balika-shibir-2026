<?php
// ============================================================
// Session Logs routes
//   GET  /session-logs   — list (params: session_id, attendee_id, attendee_ids)
//   POST /session-logs   — create (mark attendance)
// ============================================================

function handle_session_logs(string $method, array $segments): void {
    $sub = $segments[1] ?? null;

    if ($method === 'GET'  && !$sub) { session_logs_list();   return; }
    if ($method === 'POST' && !$sub) { session_logs_create(); return; }

    http_response_code(404);
    echo json_encode(['error' => 'Session-logs route not found']);
}

function session_logs_list(): void {
    require_auth();
    $db = get_db();

    $conditions = ['1=1'];
    $params     = [];

    $session_id   = $_GET['session_id']   ?? null;
    $attendee_id  = $_GET['attendee_id']  ?? null;

    if ($session_id) {
        $conditions[] = 'sl.session_id = ?';
        $params[]     = $session_id;
    }
    if ($attendee_id) {
        $conditions[] = 'sl.attendee_id = ?';
        $params[]     = (int)$attendee_id;
    }

    // Support attendee_ids[] array param
    $attendee_ids = $_GET['attendee_ids'] ?? [];
    if (!empty($attendee_ids) && is_array($attendee_ids)) {
        $placeholders = implode(',', array_fill(0, count($attendee_ids), '?'));
        $conditions[] = "sl.attendee_id IN ($placeholders)";
        foreach ($attendee_ids as $aid) $params[] = (int)$aid;
    }

    $where = implode(' AND ', $conditions);
    $stmt  = $db->prepare("
        SELECT sl.*, a.member_id, a.name AS attendee_name, a.region, a.center
        FROM session_logs sl
        LEFT JOIN attendees a ON a.id = sl.attendee_id
        WHERE $where
        ORDER BY sl.created_at DESC
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    echo json_encode(['data' => array_map('format_session_log', $rows)]);
}

function session_logs_create(): void {
    require_auth();
    $db   = get_db();
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $session_id  = $body['session_id']  ?? null;
    $attendee_id = $body['attendee_id'] ?? null;   // numeric or zero-padded string
    $status      = $body['status']      ?? 'present';

    if (!$session_id || !$attendee_id) {
        http_response_code(400);
        echo json_encode(['error' => 'session_id and attendee_id are required.']);
        return;
    }

    $attendee_id_int = (int)$attendee_id;
    $id = generate_uuid();

    $stmt = $db->prepare('
        INSERT INTO session_logs (id, session_id, attendee_id, status, scanned_at, created_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
    ');
    $stmt->execute([$id, $session_id, $attendee_id_int, $status]);

    $stmt = $db->prepare('
        SELECT sl.*, a.member_id, a.name AS attendee_name, a.region, a.center
        FROM session_logs sl
        LEFT JOIN attendees a ON a.id = sl.attendee_id
        WHERE sl.id = ?
    ');
    $stmt->execute([$id]);

    http_response_code(201);
    echo json_encode(['data' => format_session_log($stmt->fetch())]);
}

function format_session_log(array $row): array {
    return [
        'id'            => $row['id'],
        'session_id'    => $row['session_id'],
        'attendee_id'   => fmt_attendee_id((int)$row['attendee_id']),
        '_raw_attendee_id' => (int)$row['attendee_id'],
        'status'        => $row['status'],
        'scanned_at'    => $row['scanned_at'],
        'created_at'    => $row['created_at'],
        'member_id'     => $row['member_id']      ?? null,
        'attendee_name' => $row['attendee_name']   ?? null,
        'region'        => $row['region']           ?? null,
        'center'        => $row['center']           ?? null,
    ];
}
