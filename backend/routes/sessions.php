<?php
// ============================================================
// Sessions routes
//   GET  /sessions        — list all sessions
//   GET  /sessions/count  — count (for auto-numbering in AddSession)
//   POST /sessions        — create
// ============================================================

function handle_sessions(string $method, array $segments): void {
    $sub = $segments[1] ?? null;

    if ($method === 'GET'  && $sub === 'count') { sessions_count();      return; }
    if ($method === 'GET'  && !$sub)            { sessions_list();       return; }
    if ($method === 'GET'  && $sub)             { sessions_get($sub);    return; }
    if ($method === 'POST' && !$sub)            { sessions_create();     return; }

    http_response_code(404);
    echo json_encode(['error' => 'Sessions route not found']);
}

function sessions_list(): void {
    require_auth();
    $db   = get_db();
    $stmt = $db->query('SELECT * FROM sessions ORDER BY created_at ASC');
    $rows = $stmt->fetchAll();
    echo json_encode(['data' => $rows]);
}

function sessions_count(): void {
    require_auth();
    $db   = get_db();
    $stmt = $db->query('SELECT COUNT(*) AS cnt FROM sessions');
    $cnt  = (int)$stmt->fetch()['cnt'];
    echo json_encode(['count' => $cnt]);
}

function sessions_get(string $id): void {
    require_auth();
    $db   = get_db();
    $stmt = $db->prepare('SELECT * FROM sessions WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row  = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Session not found', 'data' => null]);
        return;
    }
    echo json_encode(['data' => $row]);
}

function sessions_create(): void {
    require_auth();
    $db   = get_db();
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $id         = $body['id']         ?? generate_uuid();
    $title      = trim($body['title']      ?? '');
    $start_time = $body['start_time'] ?? null;
    $end_time   = $body['end_time']   ?? null;
    $description = $body['description'] ?? null;
    $speaker     = $body['speaker']     ?? null;
    $location    = $body['location']    ?? null;

    if (!$title || !$start_time || !$end_time) {
        http_response_code(400);
        echo json_encode(['error' => 'title, start_time, and end_time are required.']);
        return;
    }

    // Convert ISO string to MySQL DATETIME
    $start = date('Y-m-d H:i:s', strtotime($start_time));
    $end   = date('Y-m-d H:i:s', strtotime($end_time));

    $stmt = $db->prepare('
        INSERT INTO sessions (id, title, description, speaker, location, start_time, end_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([$id, $title, $description, $speaker, $location, $start, $end]);

    $stmt = $db->prepare('SELECT * FROM sessions WHERE id = ?');
    $stmt->execute([$id]);

    http_response_code(201);
    echo json_encode(['data' => $stmt->fetch()]);
}
