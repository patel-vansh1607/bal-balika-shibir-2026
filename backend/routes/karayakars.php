<?php
// ============================================================
// Karayakars (volunteers) routes
//   GET    /karayakars           — list (filter: ?region=)
//   GET    /karayakars/:id       — single
//   POST   /karayakars           — create
//   PATCH  /karayakars/:id       — update
//   DELETE /karayakars/:id       — delete
// ============================================================

// Regions that require a t-shirt size
const TSHIRT_REGIONS = ['South Africa', 'Botswana'];
const TSHIRT_SIZES   = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

function handle_karayakars(string $method, array $segments): void {
    $id = $segments[1] ?? null;

    if ($method === 'GET'    && !$id) { karayakars_list();         return; }
    if ($method === 'GET'    &&  $id) { karayakars_get($id);       return; }
    if ($method === 'POST'   && !$id) { karayakars_create();       return; }
    if ($method === 'PATCH'  &&  $id) { karayakars_update($id);    return; }
    if ($method === 'DELETE' &&  $id) { karayakars_delete($id);    return; }

    http_response_code(404);
    echo json_encode(['error' => 'Karayakars route not found']);
}

function karayakars_list(): void {
    $jwt = require_auth();
    $db  = get_db();

    $conditions = ['1=1'];
    $params     = [];

    $region = $_GET['region'] ?? null;

    // Non-master_admin locked to their own region
    if ($jwt['role'] !== 'master_admin' && ($jwt['region'] ?? 'All') !== 'All') {
        $conditions[] = 'region = ?';
        $params[]     = $jwt['region'];
    } elseif ($region && $region !== 'All') {
        $conditions[] = 'region = ?';
        $params[]     = $region;
    }

    $where = implode(' AND ', $conditions);
    $stmt  = $db->prepare("SELECT * FROM karayakars WHERE $where ORDER BY created_at DESC");
    $stmt->execute($params);

    echo json_encode(['data' => array_map('format_karayakar', $stmt->fetchAll())]);
}

function karayakars_get(string $id): void {
    require_auth();
    $db = get_db();

    $stmt = $db->prepare('SELECT * FROM karayakars WHERE id = ? LIMIT 1');
    $stmt->execute([(int)$id]);
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Karayakar not found']);
        return;
    }

    echo json_encode(['data' => format_karayakar($row)]);
}

function karayakars_create(): void {
    require_auth();
    $db   = get_db();
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $full_name   = trim($body['full_name']   ?? '');
    $region      = trim($body['region']      ?? '');
    $photo_url   = trim($body['photo_url']   ?? '');
    $tshirt_size = trim($body['tshirt_size'] ?? '');

    if (!$full_name || !$region) {
        http_response_code(400);
        echo json_encode(['error' => 'full_name and region are required.']);
        return;
    }

    // Validate t-shirt size for regions that require it
    if (in_array($region, TSHIRT_REGIONS, true)) {
        if (!$tshirt_size || !in_array($tshirt_size, TSHIRT_SIZES, true)) {
            http_response_code(400);
            echo json_encode([
                'error'        => 'tshirt_size is required for ' . $region . '.',
                'valid_sizes'  => TSHIRT_SIZES,
            ]);
            return;
        }
    } else {
        $tshirt_size = null;
    }

    $stmt = $db->prepare('
        INSERT INTO karayakars (full_name, region, photo_url, tshirt_size)
        VALUES (?, ?, ?, ?)
    ');
    $stmt->execute([$full_name, $region, $photo_url ?: null, $tshirt_size]);
    $newId = (int)$db->lastInsertId();

    $stmt = $db->prepare('SELECT * FROM karayakars WHERE id = ?');
    $stmt->execute([$newId]);

    http_response_code(201);
    echo json_encode(['data' => format_karayakar($stmt->fetch())]);
}

function karayakars_update(string $id): void {
    require_auth();
    $db   = get_db();
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $stmt = $db->prepare('SELECT * FROM karayakars WHERE id = ? LIMIT 1');
    $stmt->execute([(int)$id]);
    $existing = $stmt->fetch();

    if (!$existing) {
        http_response_code(404);
        echo json_encode(['error' => 'Karayakar not found']);
        return;
    }

    $allowed = ['full_name', 'region', 'photo_url', 'tshirt_size'];
    $sets    = [];
    $params  = [];

    foreach ($allowed as $field) {
        if (array_key_exists($field, $body)) {
            $sets[]   = "$field = ?";
            $params[] = $body[$field];
        }
    }

    if (empty($sets)) {
        http_response_code(400);
        echo json_encode(['error' => 'No valid fields to update.']);
        return;
    }

    // Re-validate t-shirt size if region or tshirt_size is being updated
    $newRegion = $body['region'] ?? $existing['region'];
    $newSize   = $body['tshirt_size'] ?? $existing['tshirt_size'];

    if (in_array($newRegion, TSHIRT_REGIONS, true)) {
        if (!$newSize || !in_array($newSize, TSHIRT_SIZES, true)) {
            http_response_code(400);
            echo json_encode([
                'error'       => 'tshirt_size is required for ' . $newRegion . '.',
                'valid_sizes' => TSHIRT_SIZES,
            ]);
            return;
        }
    }

    $params[] = (int)$id;
    $stmt = $db->prepare('UPDATE karayakars SET ' . implode(', ', $sets) . ' WHERE id = ?');
    $stmt->execute($params);

    $stmt = $db->prepare('SELECT * FROM karayakars WHERE id = ?');
    $stmt->execute([(int)$id]);
    echo json_encode(['data' => format_karayakar($stmt->fetch())]);
}

function karayakars_delete(string $id): void {
    $jwt = require_auth();

    if (!in_array($jwt['role'], ['master_admin', 'super_admin'], true)) {
        http_response_code(403);
        echo json_encode(['error' => 'Insufficient permissions to delete a karayakar.']);
        return;
    }

    $db   = get_db();
    $stmt = $db->prepare('SELECT id FROM karayakars WHERE id = ? LIMIT 1');
    $stmt->execute([(int)$id]);

    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Karayakar not found']);
        return;
    }

    $db->prepare('DELETE FROM karayakars WHERE id = ?')->execute([(int)$id]);
    echo json_encode(['success' => true]);
}

function format_karayakar(array $row): array {
    return [
        'id'           => (int)$row['id'],
        'full_name'    => $row['full_name'],
        'region'       => $row['region'],
        'photo_url'    => $row['photo_url'],
        'tshirt_size'  => $row['tshirt_size'],
        'requires_tshirt' => in_array($row['region'], TSHIRT_REGIONS, true),
        'created_at'   => $row['created_at'],
    ];
}
