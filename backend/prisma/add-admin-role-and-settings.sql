-- Optional migration for existing databases: add QC_ADMIN role and new settings tables.
-- Run this only if you already have a database and are adding the new Settings feature.
-- For fresh installs, use: npm run generate-schema && npx prisma db push

-- 1. Add QC_ADMIN to the Role enum on users table (MySQL)
ALTER TABLE users MODIFY COLUMN role ENUM('QC_USER', 'QC_MANAGER', 'QC_ADMIN') NOT NULL DEFAULT 'QC_USER';

-- 2. Create app_settings table (if using raw SQL instead of Prisma db push)
CREATE TABLE IF NOT EXISTS app_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  companyName VARCHAR(255) NOT NULL DEFAULT 'QC Item System',
  companyLogo VARCHAR(255) NULL,
  softwareName VARCHAR(255) NULL,
  primaryColor VARCHAR(20) NULL,
  supportEmail VARCHAR(255) NULL,
  supportPhone VARCHAR(50) NULL,
  address TEXT NULL,
  website VARCHAR(255) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
);

-- 3. Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(20) NOT NULL UNIQUE,
  viewDashboard TINYINT(1) NOT NULL DEFAULT 1,
  viewMaster TINYINT(1) NOT NULL DEFAULT 1,
  viewOutward TINYINT(1) NOT NULL DEFAULT 1,
  viewInward TINYINT(1) NOT NULL DEFAULT 1,
  viewReports TINYINT(1) NOT NULL DEFAULT 1,
  importExportMaster TINYINT(1) NOT NULL DEFAULT 0,
  createEditOutward TINYINT(1) NOT NULL DEFAULT 1,
  createEditInward TINYINT(1) NOT NULL DEFAULT 1,
  manageUsers TINYINT(1) NOT NULL DEFAULT 0,
  accessSettings TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
);

-- 4. Insert default role permissions
INSERT IGNORE INTO role_permissions (role, viewDashboard, viewMaster, viewOutward, viewInward, viewReports, importExportMaster, createEditOutward, createEditInward, manageUsers, accessSettings)
VALUES
  ('QC_ADMIN', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1),
  ('QC_MANAGER', 1, 1, 1, 1, 1, 1, 1, 1, 0, 0),
  ('QC_USER', 1, 1, 1, 1, 1, 0, 1, 1, 0, 0);

-- 5. Insert default app settings row
INSERT IGNORE INTO app_settings (id, companyName) VALUES (1, 'QC Item System');
