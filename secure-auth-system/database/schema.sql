-- Secure Authentication System — Database Schema
-- Run this entire script against a fresh MySQL database to set up all tables.
-- Usage: mysql -u root -p < schema.sql   (or run inside MySQL Workbench / phpMyAdmin)

CREATE DATABASE IF NOT EXISTS secure_auth_system
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE secure_auth_system;

-- ============================================
-- 1. USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    failed_attempts INT NOT NULL DEFAULT 0,
    is_locked       BOOLEAN NOT NULL DEFAULT FALSE,
    locked_until    DATETIME NULL,
    password_score  INT NULL,
    last_login_at   DATETIME NULL,
    last_login_ip   VARCHAR(45) NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_email (email)
) ENGINE=InnoDB;

-- ============================================
-- 2. OTP CODES (email verification + password reset)
-- ============================================
CREATE TABLE IF NOT EXISTS otp_codes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    otp_hash    VARCHAR(255) NOT NULL,
    purpose     ENUM('email_verification', 'password_reset', 'login_2fa') NOT NULL,
    expires_at  DATETIME NOT NULL,
    is_used     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_purpose (user_id, purpose)
) ENGINE=InnoDB;

-- ============================================
-- 3. LOGIN LOGS (append-only history of every attempt)
-- ============================================
CREATE TABLE IF NOT EXISTS login_logs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NULL,
    email_attempted VARCHAR(150) NOT NULL,
    ip_address      VARCHAR(45) NOT NULL,
    user_agent      VARCHAR(255) NULL,
    status          ENUM('success', 'failed_password', 'failed_locked', 'failed_no_user') NOT NULL,
    is_suspicious   BOOLEAN NOT NULL DEFAULT FALSE,
    country_city    VARCHAR(150) NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_time (user_id, created_at),
    INDEX idx_ip_time (ip_address, created_at)
) ENGINE=InnoDB;

-- ============================================
-- 4. SESSIONS (for server-side JWT revocation / logout / timeout)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id              VARCHAR(64) PRIMARY KEY,
    user_id         INT NOT NULL,
    ip_address      VARCHAR(45) NOT NULL,
    user_agent      VARCHAR(255) NULL,
    expires_at      DATETIME NOT NULL,
    is_revoked      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ============================================
-- 5. SECURITY ALERTS
-- ============================================
CREATE TABLE IF NOT EXISTS security_alerts (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    alert_type  ENUM(
        'brute_force_detected',
        'account_locked',
        'new_device_login',
        'new_location_login',
        'weak_password',
        'password_changed'
    ) NOT NULL,
    message     TEXT NOT NULL,
    severity    ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ============================================
-- 6. PASSWORD RESET TOKENS (optional link-based alternative to OTP)
-- ============================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  DATETIME NOT NULL,
    is_used     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- 7. AI LOG ANALYSIS CACHE (avoid re-calling AI on every dashboard load)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    summary     TEXT NOT NULL,
    findings    JSON NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- Seed: one admin account for first login
-- Password below is a bcrypt hash placeholder — replace with a real hash
-- generated by your own register/hash script before using.
-- ============================================
-- INSERT INTO users (full_name, email, password_hash, role, is_verified)
-- VALUES ('System Admin', 'admin@example.com', '<bcrypt-hash-here>', 'admin', TRUE);
