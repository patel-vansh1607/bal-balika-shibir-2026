<?php
// ============================================================
// Email routes
//   POST /email/send-registration  — attendee confirmation email
//   POST /email/send-admin-welcome — admin welcome email
// ============================================================

function handle_email(string $method, array $segments): void {
    $action = $segments[1] ?? null;

    if ($method === 'POST' && $action === 'send-registration') {
        email_send_registration(); return;
    }
    if ($method === 'POST' && $action === 'send-admin-welcome') {
        email_send_admin_welcome(); return;
    }

    http_response_code(404);
    echo json_encode(['error' => 'Email route not found']);
}

function email_send_registration(): void {
    $body     = json_decode(file_get_contents('php://input'), true) ?? [];
    $email    = trim($body['email']    ?? '');
    $name     = trim($body['name']     ?? '');
    $memberId = trim($body['memberId'] ?? '');
    $region   = trim($body['region']   ?? '');
    $center   = trim($body['center']   ?? '');

    if (!$email || !$name || !$memberId) {
        http_response_code(400);
        echo json_encode(['error' => 'email, name, and memberId are required.']);
        return;
    }

    $html = <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#fcfbfa;">
  <div style="background-color:#fcfbfa;width:100%;padding:40px 0;">
    <div style="font-family:'Calibri','Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border:1px solid #e6dfd9;border-radius:16px;color:#2d2926;background-color:#ffffff;">
      <h2 style="font-size:26px;font-weight:700;color:#8a151b;text-align:center;border-bottom:1px solid #e6dfd9;padding-bottom:16px;margin-top:0;">
        Making the Right Choices
      </h2>
      <p style="font-size:20px;font-weight:700;margin-top:24px;color:#2d2926;">Jai Swaminarayan,</p>
      <p style="font-size:16px;line-height:1.6;color:#2d2926;">
        Thank you for registering <strong>{$name}</strong> for the
        <strong>Bal-Balika Shibir Africa 2026 happening in {$region}</strong>.
        We are thrilled to confirm your submission.
      </p>
      <div style="background-color:#f4ece6;border:1px solid #e6dfd9;padding:20px;border-radius:12px;margin:24px 0;">
        <p style="margin:8px 0;font-size:15px;color:#6c635c;"><strong style="text-transform:uppercase;font-size:12px;letter-spacing:0.05em;">Attendee Name:</strong> <span style="font-weight:bold;color:#2d2926;margin-left:5px;">{$name}</span></p>
        <p style="margin:8px 0;font-size:15px;color:#6c635c;"><strong style="text-transform:uppercase;font-size:12px;letter-spacing:0.05em;">Shibir ID:</strong> <span style="font-weight:bold;color:#8a151b;margin-left:5px;font-size:17px;">{$memberId}</span></p>
        <p style="margin:8px 0;font-size:15px;color:#6c635c;"><strong style="text-transform:uppercase;font-size:12px;letter-spacing:0.05em;">Country:</strong> <span style="font-weight:bold;color:#2d2926;margin-left:5px;">{$region}</span></p>
        <p style="margin:8px 0;font-size:15px;color:#6c635c;"><strong style="text-transform:uppercase;font-size:12px;letter-spacing:0.05em;">Center:</strong> <span style="font-weight:bold;color:#2d2926;margin-left:5px;">{$center}</span></p>
      </div>
      <hr style="border:0;height:1px;background:#e6dfd9;margin:24px 0;" />
      <p style="font-size:13px;color:#6c635c;text-align:center;line-height:1.5;margin-bottom:0;">
        This is an automated confirmation. Please do not reply directly to this message.
      </p>
    </div>
  </div>
</body>
</html>
HTML;

    try {
        smtp_send($email, $name, "Registration Confirmed! Shibir ID: $memberId", $html);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(502);
        echo json_encode(['error' => 'Email send failed: ' . $e->getMessage()]);
    }
}

function email_send_admin_welcome(): void {
    require_auth();
    $body     = json_decode(file_get_contents('php://input'), true) ?? [];
    $email    = trim($body['email']    ?? '');
    $name     = trim($body['name']     ?? '');
    $password = trim($body['password'] ?? '');
    $role     = trim($body['role']     ?? '');
    $region   = trim($body['region']   ?? '');
    $regions  = $body['authorized_regions'] ?? [];

    if (!$email) { http_response_code(400); echo json_encode(['error' => 'email required']); return; }

    $regionList = is_array($regions) ? implode(', ', $regions) : $region;
    $roleLabel  = match($role) {
        'master_admin' => 'Master Admin',
        'super_admin'  => 'Super Admin',
        'admin'        => 'Admin',
        default        => 'Gate Operator',
    };

    $tplFile = __DIR__ . '/../templates/admin-welcome-email.html';
    $html = file_get_contents($tplFile);
    $html = str_replace(
        ['{{name_greeting}}', '{{email}}', '{{password}}', '{{role}}', '{{region}}', '{{authorized_regions}}'],
        [
            $name ? ', ' . htmlspecialchars($name) : '',
            htmlspecialchars($email),
            htmlspecialchars($password),
            htmlspecialchars($roleLabel),
            htmlspecialchars($region),
            htmlspecialchars($regionList),
        ],
        $html
    );

    try {
        smtp_send($email, $name ?: $email, 'Your Shibir System Access Details', $html);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(502);
        echo json_encode(['error' => 'Email send failed: ' . $e->getMessage()]);
    }
}
