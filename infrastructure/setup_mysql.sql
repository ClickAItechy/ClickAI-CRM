-- Create Database
CREATE DATABASE IF NOT EXISTS finkey_crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create User
CREATE USER IF NOT EXISTS 'finkey_user'@'%' IDENTIFIED BY 'finkey_password';

-- Grant Privileges
GRANT ALL PRIVILEGES ON finkey_crm_db.* TO 'finkey_user'@'%';

FLUSH PRIVILEGES;
