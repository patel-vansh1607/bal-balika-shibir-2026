<?php
// ============================================================
// ONE-TIME admin seeder — DELETE THIS FILE AFTER USE
// Visit: http://localhost/mtrc/seed.php
// ============================================================

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

header('Content-Type: text/plain; charset=utf-8');

$email    = 'admin@shibir.org';
$password = 'Admin@2026';
$name     = 'System Administrator';
$role     = 'master_admin';

try {
    $db = get_db();

    // Check if already exists
    $check = $db->prepare('SELECT id FROM user_roles WHERE email = ? LIMIT 1');
    $check->execute([$email]);
    if ($check->fetch()) {
        echo "Admin already exists: $email\n";
        echo "No changes made.\n";
        exit;
    }

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $id   = generate_uuid();

    $stmt = $db->prepare(
        'INSERT INTO user_roles (id, email, password_hash, name, role, region, authorized_regions)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $id, $email, $hash, $name, $role, 'All',
        json_encode(['All','Kenya','Tanzania','Uganda','Zambia','Malawi','Botswana','South Africa']),
    ]);

    echo "Admin created successfully!\n";
    echo "  Email:    $email\n";
    echo "  Password: $password\n";
    echo "\nDELETE this file now: backend/seed.php\n";

} catch (Exception $e) {
    http_response_code(500);
    echo "Error: " . $e->getMessage() . "\n";
}
