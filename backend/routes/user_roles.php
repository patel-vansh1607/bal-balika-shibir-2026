<?php
// ============================================================
// User Roles routes
//   GET   /user-roles       — list all users
//   GET   /user-roles/me    — current user's full profile
//   POST  /user-roles       — create a new user
//   PATCH /user-roles/:id   — update role / authorized_regions
// ============================================================

function handle_user_roles(string $method, array $segments): void {
    $sub = $segments[1] ?? null;

    if ($method === 'GET'   && $sub === 'me') { user_roles_me();          return; }
    if ($method === 'GET'   && !$sub)         { user_roles_list();        return; }
    if ($method === 'POST'  && !$sub)         { user_roles_create();      return; }
    if ($method === 'PATCH' && $sub)          { user_roles_update($sub);  return; }

    http_response_code(404);
    echo json_encode(['error' => 'User-roles route not found']);
}

function user_roles_list(): void {
    $jwt = require_auth();
    $db  = get_db();

    // Non-master admins can only see users in their own region
    if ($jwt['role'] !== 'master_admin') {
        $stmt = $db->prepare('SELECT * FROM user_roles WHERE region = ? ORDER BY updated_at DESC');
        $stmt->execute([$jwt['region'] ?? '']);
    } else {
        $stmt = $db->query('SELECT * FROM user_roles ORDER BY updated_at DESC');
    }

    $rows = $stmt->fetchAll();
    echo json_encode(['data' => array_map('format_user_role', $rows)]);
}

function user_roles_me(): void {
    $jwt_user = require_auth();
    $db       = get_db();
    $stmt     = $db->prepare('SELECT * FROM user_roles WHERE id = ? LIMIT 1');
    $stmt->execute([$jwt_user['sub']]);
    $row = $stmt->fetch();
    if (!$row) { http_response_code(404); echo json_encode(['error' => 'Not found']); return; }
    echo json_encode(['data' => format_user_role($row)]);
}

function user_roles_create(): void {
    $jwt_user = require_auth();
    if ($jwt_user['role'] !== 'master_admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Only master_admin can create users.']);
        return;
    }

    $db   = get_db();
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $email    = trim($body['email']    ?? '');
    $password = trim($body['password'] ?? '');
    $role     = $body['role']   ?? 'operator';
    $name     = $body['name']   ?? null;
    $region   = $body['region'] ?? 'Kenya';
    $auth_regions = $body['authorized_regions'] ?? [];

    if (!$email || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'email and password are required.']);
        return;
    }

    // Check duplicate
    $stmt = $db->prepare('SELECT id FROM user_roles WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'A user with that email already exists.']);
        return;
    }

    $id   = generate_uuid();
    $hash = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $db->prepare('
        INSERT INTO user_roles (id, email, password_hash, name, role, region, authorized_regions)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([$id, $email, $hash, $name, $role, $region, json_encode($auth_regions)]);

    $stmt = $db->prepare('SELECT * FROM user_roles WHERE id = ?');
    $stmt->execute([$id]);
    $newUser = $stmt->fetch();

    // Send welcome email (best-effort, don't fail the request if email errors)
    try {
        $emailPayload = json_encode([
            'email'              => $email,
            'name'               => $name ?? '',
            'password'           => $password,
            'role'               => $role,
            'region'             => $region,
            'authorized_regions' => $auth_regions,
        ]);
        $ch = curl_init(API_BASE_URL . '/email/send-admin-welcome');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $emailPayload,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: ' . ($_SERVER['HTTP_AUTHORIZATION'] ?? ''),
            ],
        ]);
        curl_exec($ch);
        curl_close($ch);
    } catch (Throwable $e) { /* ignore */ }

    http_response_code(201);
    echo json_encode(['data' => format_user_role($newUser)]);
}

function user_roles_update(string $id): void {
    $jwt_user = require_auth();

    // Only master_admin or self can update
    $allowed_roles = ['master_admin', 'super_admin'];
    if (!in_array($jwt_user['role'], $allowed_roles, true) && $jwt_user['sub'] !== $id) {
        http_response_code(403);
        echo json_encode(['error' => 'Insufficient permissions.']);
        return;
    }

    $db   = get_db();

    // Prevent changing the role of a master_admin
    $target = $db->prepare('SELECT role FROM user_roles WHERE id = ? LIMIT 1');
    $target->execute([$id]);
    $targetRow = $target->fetch();
    if ($targetRow && $targetRow['role'] === 'master_admin') {
        http_response_code(403);
        echo json_encode(['error' => 'The role of a master_admin cannot be changed.']);
        return;
    }

    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $sets   = [];
    $params = [];

    if (isset($body['role'])) {
        $sets[]   = 'role = ?';
        $params[] = $body['role'];
    }
    if (isset($body['authorized_regions'])) {
        $sets[]   = 'authorized_regions = ?';
        $params[] = json_encode($body['authorized_regions']);
    }
    if (isset($body['name'])) {
        $sets[]   = 'name = ?';
        $params[] = $body['name'];
    }
    if (isset($body['region'])) {
        $sets[]   = 'region = ?';
        $params[] = $body['region'];
    }
    // Allow password update by master_admin
    if (isset($body['password']) && $jwt_user['role'] === 'master_admin') {
        $sets[]   = 'password_hash = ?';
        $params[] = password_hash($body['password'], PASSWORD_BCRYPT);
    }

    if (empty($sets)) {
        http_response_code(400);
        echo json_encode(['error' => 'No valid fields to update.']);
        return;
    }

    $params[] = $id;
    $stmt = $db->prepare('UPDATE user_roles SET ' . implode(', ', $sets) . ' WHERE id = ?');
    $stmt->execute($params);

    $stmt = $db->prepare('SELECT * FROM user_roles WHERE id = ?');
    $stmt->execute([$id]);
    echo json_encode(['data' => format_user_role($stmt->fetch())]);
}

function format_user_role(array $row): array {
    return [
        'id'                 => $row['id'],
        'email'              => $row['email'],
        'name'               => $row['name'],
        'role'               => $row['role'],
        'region'             => $row['region'],
        'authorized_regions' => decode_json_col($row['authorized_regions']),
        'updated_at'         => $row['updated_at'],
    ];
}
