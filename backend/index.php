<?php
// ============================================================
// Bal-Balika Shibir 2026 — PHP API Router
// ============================================================

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/mailer.php';

// --- CORS ---
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ALLOWED_ORIGINS, true)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: ' . (ALLOWED_ORIGINS[0] ?? '*'));
}
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- Parse route ---
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri    = rtrim($uri, '/');
$method = $_SERVER['REQUEST_METHOD'];

// API is deployed at https://api.riftkoders.com/mtrc
$base = '/mtrc';
if ($base && str_starts_with($uri, $base)) {
    $uri = substr($uri, strlen($base));
}
if ($uri === '') $uri = '/';

$segments = array_values(array_filter(explode('/', $uri)));

// --- Route to handler ---
$group = $segments[0] ?? '';

switch ($group) {
    case 'auth':
        require_once __DIR__ . '/routes/auth.php';
        handle_auth($method, $segments);
        break;

    case 'attendees':
        require_once __DIR__ . '/routes/attendees.php';
        handle_attendees($method, $segments);
        break;

    case 'sessions':
        require_once __DIR__ . '/routes/sessions.php';
        handle_sessions($method, $segments);
        break;

    case 'session-logs':
        require_once __DIR__ . '/routes/session_logs.php';
        handle_session_logs($method, $segments);
        break;

    case 'gate-logs':
        require_once __DIR__ . '/routes/gate_logs.php';
        handle_gate_logs($method, $segments);
        break;

    case 'user-roles':
        require_once __DIR__ . '/routes/user_roles.php';
        handle_user_roles($method, $segments);
        break;

    case 'upload':
        require_once __DIR__ . '/routes/upload.php';
        handle_upload($method, $segments);
        break;

    case 'email':
        require_once __DIR__ . '/routes/email.php';
        handle_email($method, $segments);
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Route not found']);
}
