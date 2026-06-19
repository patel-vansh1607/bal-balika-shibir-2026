<?php
// ============================================================
// File upload routes
//   POST /upload/photo  — profile photo (multipart)
//   POST /upload/qr     — QR code SVG (multipart)
// ============================================================

function handle_upload(string $method, array $segments): void {
    $type = $segments[1] ?? null;

    if ($method === 'POST' && $type === 'photo') { upload_photo(); return; }
    if ($method === 'POST' && $type === 'qr')    { upload_qr();    return; }

    http_response_code(404);
    echo json_encode(['error' => 'Upload route not found']);
}

function upload_photo(): void {
    // Public registration uploads photos without a token — no auth check here

    if (empty($_FILES['file'])) {
        http_response_code(400);
        echo json_encode(['error' => 'No file uploaded. Send field name "file".']);
        return;
    }

    $file     = $_FILES['file'];
    $filename = $_POST['filename'] ?? basename($file['name']);

    // Sanitize filename
    $filename = preg_replace('/[^a-zA-Z0-9._\-]/', '_', $filename);
    if (!str_ends_with(strtolower($filename), '.jpg') &&
        !str_ends_with(strtolower($filename), '.jpeg') &&
        !str_ends_with(strtolower($filename), '.png') &&
        !str_ends_with(strtolower($filename), '.webp')) {
        $filename .= '.jpg';
    }

    $dir = __DIR__ . '/../uploads/photos/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $dest = $dir . $filename;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save uploaded photo.']);
        return;
    }

    $url = API_BASE_URL . '/uploads/photos/' . $filename;
    echo json_encode(['url' => $url]);
}

function upload_qr(): void {
    // Public registration uploads QR codes without a token — no auth check here

    if (empty($_FILES['file'])) {
        http_response_code(400);
        echo json_encode(['error' => 'No file uploaded. Send field name "file".']);
        return;
    }

    $file     = $_FILES['file'];
    $filename = $_POST['filename'] ?? basename($file['name']);

    // Sanitize filename
    $filename = preg_replace('/[^a-zA-Z0-9._\-]/', '_', $filename);
    if (!str_ends_with(strtolower($filename), '.svg') &&
        !str_ends_with(strtolower($filename), '.png')) {
        $filename .= '.svg';
    }

    $dir = __DIR__ . '/../qr_codes/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $dest = $dir . $filename;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save QR file.']);
        return;
    }

    $url = API_BASE_URL . '/qr_codes/' . $filename;
    echo json_encode(['url' => $url]);
}
