-- Add avatar column to users table (filename from /assets/avatar/, e.g. default-avatar.svg).
-- Run only if you already have a database. For fresh installs use: npm run generate-schema && npx prisma db push

ALTER TABLE users ADD COLUMN avatar VARCHAR(255) NULL AFTER isActive;
