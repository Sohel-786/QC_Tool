-- Fix invalid datetime values (e.g. 0000-00-00 or day/month zero) that cause Prisma to error.
-- Run with: npm run db:fix-datetimes

UPDATE role_permissions SET createdAt = NOW(), updatedAt = NOW();

UPDATE app_settings SET createdAt = NOW(), updatedAt = NOW();
