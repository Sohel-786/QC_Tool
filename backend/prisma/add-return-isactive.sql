-- Add isActive column to returns table (run this if prisma db push is not used)
-- MySQL: run with your DB client or: mysql -u user -p qc_tool < prisma/add-return-isactive.sql

ALTER TABLE `returns` ADD COLUMN `isActive` TINYINT(1) NOT NULL DEFAULT 1;
