-- ============================================================
-- Bal-Balika Shibir 2026 — MySQL Schema
-- Deploy this on your cPanel MySQL database
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS session_logs;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS gate_logs;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS attendees;
DROP TABLE IF EXISTS user_roles;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. user_roles (replaces Supabase Auth + user_roles)
--    Each row is a system user with login credentials
-- ============================================================
CREATE TABLE user_roles (
    id          CHAR(36)     NOT NULL,
    email       VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name        VARCHAR(255) DEFAULT NULL,
    role        VARCHAR(50)  NOT NULL DEFAULT 'operator',
    region      VARCHAR(100) NOT NULL DEFAULT 'Kenya',
    authorized_regions JSON NOT NULL DEFAULT ('[]'),
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_roles_pkey     PRIMARY KEY (id),
    CONSTRAINT user_roles_email_uk UNIQUE (email),
    CONSTRAINT user_roles_role_ck  CHECK (role IN ('master_admin','super_admin','admin','operator'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. attendees
--    id is an auto-increment integer displayed as zero-padded string
--    member_id is the public MTRC-XX-NNNN identifier
-- ============================================================
CREATE TABLE attendees (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name            TEXT         NOT NULL,
    age             INT          NOT NULL,
    center          TEXT         NOT NULL,
    parent_contact  TEXT         DEFAULT NULL,
    parent_email    VARCHAR(255) DEFAULT NULL,
    status          VARCHAR(50)  NOT NULL DEFAULT 'Pending',
    photo_url       TEXT         DEFAULT NULL,
    qr_code_url     TEXT         DEFAULT NULL,
    gender          VARCHAR(20)  NOT NULL DEFAULT 'Balak',
    region          VARCHAR(100) DEFAULT NULL,
    member_id       VARCHAR(50)  DEFAULT NULL,
    is_archived     TINYINT(1)   NOT NULL DEFAULT 0,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT attendees_pkey     PRIMARY KEY (id),
    CONSTRAINT attendees_memberid UNIQUE (member_id),
    CONSTRAINT attendees_gender_ck CHECK (gender IN ('Balak','Balika','Shishu','Shishika'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. sessions
-- ============================================================
CREATE TABLE sessions (
    id          CHAR(36)     NOT NULL,
    title       TEXT         NOT NULL,
    description TEXT         DEFAULT NULL,
    speaker     TEXT         DEFAULT NULL,
    location    TEXT         DEFAULT NULL,
    start_time  DATETIME     NOT NULL,
    end_time    DATETIME     NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sessions_pkey PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. session_logs  (attendance per session)
-- ============================================================
CREATE TABLE session_logs (
    id          CHAR(36)     NOT NULL,
    session_id  CHAR(36)     NOT NULL,
    attendee_id INT UNSIGNED NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'present',
    scanned_at  DATETIME     DEFAULT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT session_logs_pkey  PRIMARY KEY (id),
    CONSTRAINT session_logs_sess  FOREIGN KEY (session_id)  REFERENCES sessions(id)  ON DELETE CASCADE,
    CONSTRAINT session_logs_att   FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE,
    CONSTRAINT session_logs_status_ck CHECK (status IN ('present','absent'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. gate_logs
-- ============================================================
CREATE TABLE gate_logs (
    id              CHAR(36)     NOT NULL,
    scanned_id      VARCHAR(100) NOT NULL,
    status          VARCHAR(20)  NOT NULL,
    message         TEXT         NOT NULL,
    operator_email  VARCHAR(255) NOT NULL,
    attendee_name   VARCHAR(255) DEFAULT NULL,
    operator_name   VARCHAR(255) DEFAULT NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT gate_logs_pkey PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. attendance  (simple check-in records)
-- ============================================================
CREATE TABLE attendance (
    id            CHAR(36)     NOT NULL,
    member_id     INT UNSIGNED DEFAULT NULL,
    checked_in_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checked_by    CHAR(36)     DEFAULT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'present',
    CONSTRAINT attendance_pkey      PRIMARY KEY (id),
    CONSTRAINT attendance_member_fk FOREIGN KEY (member_id)  REFERENCES attendees(id)  ON DELETE SET NULL,
    CONSTRAINT attendance_user_fk   FOREIGN KEY (checked_by) REFERENCES user_roles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Seed: create a default master_admin user
--   email: admin@shibir.org
--   password: Admin@2026  (bcrypt hash below)
--   CHANGE THE PASSWORD after first login via AdminControl
-- ============================================================
INSERT INTO user_roles (id, email, password_hash, name, role, region, authorized_regions)
VALUES (
    UUID(),
    'admin@shibir.org',
    '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'System Administrator',
    'master_admin',
    'All',
    JSON_ARRAY('All','Kenya','Tanzania','Uganda','Zambia','Malawi','Botswana','South Africa')
);
