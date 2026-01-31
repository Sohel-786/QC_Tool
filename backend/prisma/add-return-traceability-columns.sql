-- Add traceability columns to returns table (company, contractor, machine, location)
-- Run this if GET /returns fails with: column qc_tool.returns.companyId does not exist
-- Usage: mysql -u <user> -p qc_tool < add-return-traceability-columns.sql
-- Or run each statement in your MySQL client.

ALTER TABLE `returns`
  ADD COLUMN `companyId` INT NULL,
  ADD COLUMN `contractorId` INT NULL,
  ADD COLUMN `machineId` INT NULL,
  ADD COLUMN `locationId` INT NULL;

ALTER TABLE `returns`
  ADD CONSTRAINT `returns_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `returns_contractorId_fkey` FOREIGN KEY (`contractorId`) REFERENCES `contractors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `returns_machineId_fkey` FOREIGN KEY (`machineId`) REFERENCES `machines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `returns_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX `returns_companyId_idx` ON `returns`(`companyId`);
CREATE INDEX `returns_contractorId_idx` ON `returns`(`contractorId`);
CREATE INDEX `returns_machineId_idx` ON `returns`(`machineId`);
CREATE INDEX `returns_locationId_idx` ON `returns`(`locationId`);
