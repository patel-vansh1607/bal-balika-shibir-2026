-- Run this once in cPanel phpMyAdmin on the rift_mtrc database
CREATE TABLE IF NOT EXISTS karayakars (
    id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    full_name    TEXT          NOT NULL,
    region       VARCHAR(100)  NOT NULL,
    photo_url    TEXT          DEFAULT NULL,
    tshirt_size  VARCHAR(10)   DEFAULT NULL,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT karayakars_pkey        PRIMARY KEY (id),
    CONSTRAINT karayakars_tshirt_ck   CHECK (tshirt_size IS NULL OR tshirt_size IN ('XS','S','M','L','XL','XXL'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
