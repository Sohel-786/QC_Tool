-- Add receivedBy column to returns table (optional: who received the inward)
-- Use this if you prefer to run SQL manually instead of prisma db push.
--
-- Option 1 - Prisma (from backend folder):
--   npx prisma db execute --file prisma/add-return-received-by.sql --schema prisma/schema.prisma
--
-- Option 2 - MySQL CLI:
--   mysql -u YOUR_USER -p qc_tool < prisma/add-return-received-by.sql

ALTER TABLE `returns` ADD COLUMN `receivedBy` VARCHAR(255) NULL AFTER `remarks`;
