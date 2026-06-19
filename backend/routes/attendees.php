<?php
// ============================================================
// Attendees routes
//   GET    /attendees              — list (filters: region, gender, archived, prefix, member_id, id)
//   GET    /attendees/:id          — single by numeric id or member_id
//   POST   /attendees              — create
//   PATCH  /attendees/:id          — update
// ============================================================

function handle_attendees(string $method, array $segments): void {
    $id = $segments[1] ?? null;

    if ($method === 'GET' && !$id)   { attendees_list();       return; }
    if ($method === 'GET' && $id)    { attendees_get($id);     return; }
    if ($method === 'POST' && !$id)  { attendees_create();     return; }
    if ($method === 'PATCH' && $id)  { attendees_update($id);  return; }

    http_response_code(404);
    echo json_encode(['error' => 'Attendees route not found']);
}

function attendees_list(): void {
    $jwt = require_auth();
    $db  = get_db();

    $conditions = ['1=1'];
    $params     = [];

    $region   = $_GET['region']   ?? null;
    $gender   = $_GET['gender']   ?? null;
    $archived = $_GET['archived'] ?? null;
    $prefix   = $_GET['prefix']   ?? null;

    // Non-master_admin users are locked to their own region
    if ($jwt['role'] !== 'master_admin' && ($jwt['region'] ?? 'All') !== 'All') {
        $conditions[] = 'region = ?';
        $params[]     = $jwt['region'];
    } elseif ($region && $region !== 'All') {
        $conditions[] = 'region = ?';
        $params[]     = $region;
    }
    if ($gender && $gender !== 'All') {
        $conditions[] = 'gender = ?';
        $params[]     = $gender;
    }
    if ($archived !== null) {
        $conditions[] = 'is_archived = ?';
        $params[]     = (int)(bool)$archived;
    } else {
        // Default: return non-archived records
        $conditions[] = 'is_archived = 0';
    }
    if ($prefix) {
        $conditions[] = 'member_id LIKE ?';
        $params[]     = $prefix . '%';
    }

    $where = implode(' AND ', $conditions);
    $stmt  = $db->prepare("SELECT * FROM attendees WHERE $where ORDER BY created_at DESC");
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    echo json_encode(['data' => array_map('format_attendee', $rows)]);
}

function attendees_get(string $id): void {
    require_auth();
    $db = get_db();

    // Try member_id first, then numeric id
    $stmt = $db->prepare('SELECT * FROM attendees WHERE member_id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();

    if (!$row && is_numeric($id)) {
        $stmt = $db->prepare('SELECT * FROM attendees WHERE id = ? LIMIT 1');
        $stmt->execute([(int)$id]);
        $row = $stmt->fetch();
    }

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Attendee not found', 'data' => null]);
        return;
    }

    echo json_encode(['data' => format_attendee($row)]);
}

function attendees_create(): void {
    require_auth();
    $db   = get_db();
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $name           = trim($body['name']           ?? '');
    $age            = (int)($body['age']            ?? 0);
    $center         = trim($body['center']          ?? '');
    $parent_contact = trim($body['parent_contact']  ?? '');
    $parent_email   = trim($body['parent_email']    ?? '');
    $status         = $body['status']   ?? 'Pending';
    $gender         = $body['gender']   ?? 'Balak';
    $region         = trim($body['region'] ?? '');

    if (!$name || !$age || !$center) {
        http_response_code(400);
        echo json_encode(['error' => 'name, age, and center are required.']);
        return;
    }

    // Generate member_id
    $prefixes = REGION_PREFIXES;
    $prefix   = $prefixes[$region] ?? 'MTRC-';
    $stmt     = $db->prepare('SELECT COUNT(*) as cnt FROM attendees WHERE member_id LIKE ?');
    $stmt->execute([$prefix . '%']);
    $count     = (int)$stmt->fetch()['cnt'];
    $member_id = $prefix . str_pad((string)($count + 1), 4, '0', STR_PAD_LEFT);

    $id_str = generate_uuid();

    $stmt = $db->prepare('
        INSERT INTO attendees (name, age, center, parent_contact, parent_email, status, gender, region, member_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([$name, $age, $center, $parent_contact, $parent_email, $status, $gender, $region, $member_id]);
    $newId = (int)$db->lastInsertId();

    $stmt = $db->prepare('SELECT * FROM attendees WHERE id = ?');
    $stmt->execute([$newId]);
    $row = $stmt->fetch();

    http_response_code(201);
    echo json_encode(['data' => format_attendee($row)]);
}

function attendees_update(string $id): void {
    require_auth();
    $db   = get_db();
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    // Find by numeric id
    $stmt = $db->prepare('SELECT id FROM attendees WHERE id = ? LIMIT 1');
    $stmt->execute([(int)$id]);
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Attendee not found']);
        return;
    }

    $allowed = ['name','age','center','parent_contact','parent_email','status','gender','region','photo_url','qr_code_url','is_archived'];
    $sets    = [];
    $params  = [];

    foreach ($allowed as $field) {
        if (array_key_exists($field, $body)) {
            $sets[]   = "$field = ?";
            $params[] = $field === 'is_archived' ? (int)(bool)$body[$field] : $body[$field];
        }
    }

    if (empty($sets)) {
        http_response_code(400);
        echo json_encode(['error' => 'No valid fields to update.']);
        return;
    }

    $params[] = (int)$id;
    $stmt = $db->prepare('UPDATE attendees SET ' . implode(', ', $sets) . ' WHERE id = ?');
    $stmt->execute($params);

    $stmt = $db->prepare('SELECT * FROM attendees WHERE id = ?');
    $stmt->execute([(int)$id]);
    echo json_encode(['data' => format_attendee($stmt->fetch())]);
}

function format_attendee(array $row): array {
    return [
        'id'             => fmt_attendee_id((int)$row['id']),
        '_raw_id'        => (int)$row['id'],
        'name'           => $row['name'],
        'age'            => (int)$row['age'],
        'center'         => $row['center'],
        'parent_contact' => $row['parent_contact'],
        'parent_email'   => $row['parent_email'],
        'status'         => $row['status'],
        'photo_url'      => $row['photo_url'],
        'qr_code_url'    => $row['qr_code_url'],
        'gender'         => $row['gender'],
        'region'         => $row['region'],
        'member_id'      => $row['member_id'],
        'is_archived'    => (bool)$row['is_archived'],
        'created_at'     => $row['created_at'],
    ];
}
