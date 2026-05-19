-- ============================================================
-- FarmerPay Database Initialization Script
-- ============================================================
-- Run this script as MySQL root to set up databases and user:
--   mysql -u root -p < scripts/db-setup.sql
-- ============================================================

-- Create databases with utf8mb4 charset for multi-language & emoji support
CREATE DATABASE IF NOT EXISTS farmerpay_dev
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS farmerpay_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS farmerpay_prod
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Create application user
-- IMPORTANT: Change the password before using in any non-local environment
CREATE USER IF NOT EXISTS 'farmerpay_user'@'localhost'
  IDENTIFIED BY 'farmerpay_dev_pass';

CREATE USER IF NOT EXISTS 'farmerpay_user'@'%'
  IDENTIFIED BY 'farmerpay_dev_pass';

-- Grant privileges on all FarmerPay databases
GRANT ALL PRIVILEGES ON farmerpay_dev.* TO 'farmerpay_user'@'localhost';
GRANT ALL PRIVILEGES ON farmerpay_dev.* TO 'farmerpay_user'@'%';

GRANT ALL PRIVILEGES ON farmerpay_test.* TO 'farmerpay_user'@'localhost';
GRANT ALL PRIVILEGES ON farmerpay_test.* TO 'farmerpay_user'@'%';

GRANT ALL PRIVILEGES ON farmerpay_prod.* TO 'farmerpay_user'@'localhost';
GRANT ALL PRIVILEGES ON farmerpay_prod.* TO 'farmerpay_user'@'%';

-- Apply privilege changes
FLUSH PRIVILEGES;

-- Verify setup
SELECT 'Databases created:' AS status;
SHOW DATABASES LIKE 'farmerpay_%';

SELECT 'User grants:' AS status;
SHOW GRANTS FOR 'farmerpay_user'@'localhost';
