<?php
// ============================================================
// Bal-Balika Shibir 2026 — Backend Configuration
// FILL IN your cPanel database and API credentials below
// ============================================================

// --- MySQL Database ---
define('DB_HOST', 'localhost');
define('DB_NAME', 'rift_mtrc');
define('DB_USER', 'rift_mtrc');
define('DB_PASS', 'THISDAY2027willbegreat');
define('DB_CHARSET', 'utf8mb4');

// --- Resend Email API ---
define('RESEND_API_KEY', 're_YOUR_RESEND_API_KEY_HERE');

// --- JWT ---
define('JWT_SECRET', 'mtrc-riftkoders-2026-j8xK!vPqLnZ#mR3wA9dYeT5sUhCbFoG');
define('JWT_EXPIRY', 60 * 60 * 24 * 7); // 7 days in seconds

// --- API Base URL (where this backend is hosted) ---
// This is used to build file upload URLs returned to the frontend
define('API_BASE_URL', 'https://api.riftkoders.com/mtrc');

// --- Email (SMTP via riftkoders.com) ---
define('SMTP_HOST',      'mail.riftkoders.com');
define('SMTP_PORT',      465);
define('SMTP_USER',      'mtrc@riftkoders.com');
define('SMTP_PASS',      'THISDAY2027willbegreat');
define('SMTP_FROM_NAME', 'Bal-Balika Shibir');

// --- CORS: Allowed frontend origins ---
// Add your Vercel domain(s) here
define('ALLOWED_ORIGINS', [
    'https://mtrc-c3iphmjv2-roarwave.vercel.app',
    'https://mtrc-one.vercel.app',
    'https://bal-balika-shibir-2026-i6mifincu-vansh-patels-projects-b73fb175.vercel.app',
    'https://mtrc-2026.vercel.app',
    'https://www.mtrc2026.site',
    'http://localhost:3000',
    'http://localhost:3001',
]);

// --- Region → member_id prefix mapping ---
define('REGION_PREFIXES', [
    'Kenya'        => 'MTRC-KE-',
    'Uganda'       => 'MTRC-UG-',
    'Tanzania'     => 'MTRC-TZ-',
    'Zambia'       => 'MTRC-ZM-',
    'Malawi'       => 'MTRC-MW-',
    'Botswana'     => 'MTRC-BW-',
    'South Africa' => 'MTRC-ZA-',
]);
