<?php
// ============================================================
// Gate Logs routes
//   GET  /gate-logs   — list recent logs (param: limit)
//   POST /gate-logs   — create a log entry
// ============================================================

function handle_gate_logs(string $method, array $segments): void {
    $sub = $segments[1] ?? null;

    if ($method === 'GET'  && !$sub) { gate_logs_list();   return; }
    if ($method === 'POST' && !$sub) { gate_logs_create(); return; }

    http_response_code(404);
    echo json_encode(['error' => 'Gate-logs route not found']);
}

function gate_logs_list(): void {
    require_auth();
    $db    = get_db();
    $limit = min((int)($_GET['limit'] ?? 20), 200);

    $stmt = $db->prepare('SELECT * FROM gate_logs ORDER BY created_at DESC LIMIT ?');
    $stmt->execute([$limit]);
    echo json_encode(['data' => $stmt->fetchAll()]);
}

function gate_logs_create(): void {
    require_auth();
    $db   = get_db();
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $id            = generate_uuid();
    $scanned_id    = trim($body['scanned_id']    ?? '');
    $status        = trim($body['status']        ?? '');
    $message       = trim($body['message']       ?? '');
    $operator_email= trim($body['operator_email'] ?? '');
    $attendee_name = $body['attendee_name'] ?? null;
    $operator_name = $body['operator_name'] ?? null;

    if (!$scanned_id || !$status || !$message || !$operator_email) {
        http_response_code(400);
        echo json_encode(['error' => 'scanned_id, status, message, and operator_email are required.']);
        return;
    }

    $stmt = $db->prepare('
        INSERT INTO gate_logs (id, scanned_id, status, message, operator_email, attendee_name, operator_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([$id, $scanned_id, $status, $message, $operator_email, $attendee_name, $operator_name]);

    $stmt = $db->prepare('SELECT * FROM gate_logs WHERE id = ?');
    $stmt->execute([$id]);

    http_response_code(201);
    echo json_encode(['data' => $stmt->fetch()]);
}
