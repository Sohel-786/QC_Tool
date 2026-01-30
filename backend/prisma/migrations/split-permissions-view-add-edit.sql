-- Split createEditOutward/createEditInward into view/add/edit per section
-- Run this only on existing DBs that still have createEditOutward/createEditInward.
-- For new DBs, use: npx prisma migrate dev (or db push) so the schema is created with the new columns.
-- Add new columns
ALTER TABLE role_permissions ADD COLUMN addOutward BOOLEAN DEFAULT true;
ALTER TABLE role_permissions ADD COLUMN editOutward BOOLEAN DEFAULT true;
ALTER TABLE role_permissions ADD COLUMN addInward BOOLEAN DEFAULT true;
ALTER TABLE role_permissions ADD COLUMN editInward BOOLEAN DEFAULT true;
ALTER TABLE role_permissions ADD COLUMN addMaster BOOLEAN DEFAULT true;
ALTER TABLE role_permissions ADD COLUMN editMaster BOOLEAN DEFAULT true;

-- Migrate from old columns (if they exist)
UPDATE role_permissions SET
  addOutward = COALESCE(createEditOutward, true),
  editOutward = COALESCE(createEditOutward, true),
  addInward = COALESCE(createEditInward, true),
  editInward = COALESCE(createEditInward, true),
  addMaster = COALESCE(viewMaster, true),
  editMaster = COALESCE(viewMaster, true)
WHERE 1=1;

-- Drop old columns (run only after confirming addOutward etc exist in schema)
ALTER TABLE role_permissions DROP COLUMN createEditOutward;
ALTER TABLE role_permissions DROP COLUMN createEditInward;
