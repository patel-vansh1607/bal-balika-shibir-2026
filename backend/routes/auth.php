<?php
// ============================================================
// Auth routes
//   POST /auth/login   — email + password → JWT
//   GET  /auth/me      — validate token → user data
// ============================================================

function handle_auth(string $method, array $segments): void {
    $action = $segments[1] ?? '';

    if ($method === 'POST' && $action === 'login') {
        auth_login();
    } elseif ($method === 'GET' && $action === 'me') {
        auth_me();
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Auth route not found']);
    }
}

function auth_login(): void {
    $body = json_decode(file_get_contents('php://input'), true);
    $email    = trim($body['email']    ?? '');
    $password = trim($body['password'] ?? '');

    if (!$email || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and password are required.']);
        return;
    }

    $db   = get_db();
    $stmt = $db->prepare('SELECT * FROM user_roles WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid email or password.']);
        return;
    }

    $payload = [
        'sub'   => $user['id'],
        'email' => $user['email'],
        'role'  => $user['role'],
        'iat'   => time(),
        'exp'   => time() + JWT_EXPIRY,
    ];
    $token = jwt_encode($payload);

    echo json_encode([
        'token' => $token,
        'user'  => format_user($user),
    ]);
}

function auth_me(): void {
    $user_data = require_auth();

    $db   = get_db();
    $stmt = $db->prepare('SELECT * FROM user_roles WHERE id = ? LIMIT 1');
    $stmt->execute([$user_data['sub']]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found.']);
        return;
    }

    echo json_encode(['user' => format_user($user)]);
}

function format_user(array $user): array {
    return [
        'id'                 => $user['id'],
        'email'              => $user['email'],
        'name'               => $user['name'],
        'role'               => $user['role'],
        'region'             => $user['region'],
        'authorized_regions' => decode_json_col($user['authorized_regions']),
    ];
}
