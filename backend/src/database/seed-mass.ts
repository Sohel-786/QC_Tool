/**
 * Mass seed for valve manufacturing company: masters, items, issues, returns.
 * Uses dummy_image.webp for all item and return images.
 *
 * Masters: Statuses, Item categories, Companies, Contractors, Machines, Locations.
 * Outward (issues): each issue has companyId, contractorId, machineId, locationId (required).
 * Inward (returns): from issues (company, contractor, machine, location via return.issue) or receive missing item.
 *
 * Run from backend: npm run seed
 * Clean then seed: npm run seed:fresh  (or: npm run seed -- --clean)
 * Dummy image path: frontend/public/assets/dummy_image.webp (or backend/seed-assets/dummy_image.webp)
 */

import path from "path";
import fs from "fs";
import { PrismaClient, ItemStatus, Role } from "@prisma/client";
import { hashPassword } from "../utils/auth";

const prisma = new PrismaClient();

const CLEAN_BEFORE_SEED = process.argv.includes("--clean");

const CONDITIONS = ["OK", "Damaged", "Calibration Required", "Missing"] as const;

function sanitizeSerial(serial: string): string {
  if (!serial || typeof serial !== "string") return "unknown";
  return serial
    .trim()
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 120) || "unknown";
}

function getDummyImagePath(): string | null {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "..", "frontend", "public", "assets", "dummy_image.webp"),
    path.join(cwd, "seed-assets", "dummy_image.webp"),
    path.join(cwd, "..", "..", "frontend", "public", "assets", "dummy_image.webp"),
  ];
  for (const p of candidates) {
    const resolved = path.resolve(p);
    if (fs.existsSync(resolved)) return resolved;
  }
  return null;
}

function ensureStorageDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyDummyToItemMaster(storageRoot: string, serial: string, dummyPath: string): string {
  const safe = sanitizeSerial(serial);
  const dir = path.join(storageRoot, "items", safe);
  ensureStorageDir(dir);
  const dest = path.join(dir, "master.webp");
  fs.copyFileSync(dummyPath, dest);
  return `items/${safe}/master.webp`;
}

function copyDummyToInward(
  storageRoot: string,
  serial: string,
  filename: string,
  dummyPath: string
): string {
  const safe = sanitizeSerial(serial);
  const dir = path.join(storageRoot, "items", safe, "inward");
  ensureStorageDir(dir);
  const dest = path.join(dir, filename);
  fs.copyFileSync(dummyPath, dest);
  return `items/${safe}/inward/${filename}`;
}

async function ensureUsers() {
  const count = await prisma.user.count();
  if (count > 0) return;
  const adminPassword = await hashPassword("admin123");
  const userPassword = await hashPassword("password123");
  await prisma.user.createMany({
    data: [
      {
        username: "qc_admin",
        password: adminPassword,
        firstName: "QC",
        lastName: "Admin",
        role: Role.QC_ADMIN,
        isActive: true,
      },
      {
        username: "qc_user",
        password: userPassword,
        firstName: "QC",
        lastName: "User",
        role: Role.QC_USER,
        isActive: true,
      },
    ],
  });
  console.log("  Users created (qc_admin / admin123, qc_user / password123)");
}

async function seedStatuses() {
  const existing = await prisma.status.findMany({ select: { name: true } });
  const names = ["Available", "Missing"];
  for (const name of names) {
    if (!existing.some((s) => s.name === name)) {
      await prisma.status.create({ data: { name, isActive: true } });
    }
  }
  console.log("  Statuses: Available, Missing");
}

async function seedItemCategories() {
  const names = [
    "Gate Valves",
    "Globe Valves",
    "Ball Valves",
    "Butterfly Valves",
    "Check Valves",
    "Control Valves",
    "Safety Valves",
    "Actuators",
  ];
  for (const name of names) {
    await prisma.itemCategory.upsert({
      where: { name },
      create: { name, isActive: true },
      update: {},
    });
  }
  console.log(`  Item categories: ${names.length}`);
}

async function seedCompanies() {
  const names = [
    "Aira Euro Valves Pvt Ltd",
    "ValveTech Industries",
    "Precision Valve Co",
    "Flow Control Solutions",
    "Industrial Valve Corp",
    "Euro Valve Manufacturing",
    "Quality Valve Systems",
    "Global Valve Supplies",
  ];
  for (const name of names) {
    const exists = await prisma.company.findFirst({ where: { name } });
    if (!exists) await prisma.company.create({ data: { name, isActive: true } });
  }
  console.log(`  Companies: ${names.length}`);
}

async function seedContractors() {
  const names = [
    "ABC Maintenance",
    "Site Works Ltd",
    "Field Services Co",
    "Plant Contractors",
    "Maintenance Pro",
    "OnSite Engineers",
    "Valve Installers Inc",
    "Pipeline Services",
  ];
  for (const name of names) {
    const exists = await prisma.contractor.findFirst({ where: { name } });
    if (!exists) await prisma.contractor.create({ data: { name, isActive: true } });
  }
  console.log(`  Contractors: ${names.length}`);
}

async function seedMachines() {
  const names = [
    "Lathe-01",
    "CNC-02",
    "Assembly Line A",
    "Testing Station 1",
    "Grinding M/C",
    "Drilling M/C",
    "Assembly Line B",
    "Calibration Lab",
  ];
  for (const name of names) {
    const exists = await prisma.machine.findFirst({ where: { name } });
    if (!exists) await prisma.machine.create({ data: { name, isActive: true } });
  }
  console.log(`  Machines: ${names.length}`);
}

async function seedLocations() {
  const names = [
    "Store A",
    "Store B",
    "Production Floor 1",
    "Production Floor 2",
    "Calibration Room",
    "Inspection Area",
    "Dispatch Bay",
    "Receiving Dock",
  ];
  for (const name of names) {
    const exists = await prisma.location.findFirst({ where: { name } });
    if (!exists) await prisma.location.create({ data: { name, isActive: true } });
  }
  console.log(`  Locations: ${names.length}`);
}

async function seedItems(storageRoot: string, dummyPath: string | null) {
  const categories = await prisma.itemCategory.findMany({ where: { isActive: true } });
  if (categories.length === 0) throw new Error("No categories");
  const itemTemplates: { name: string; prefix: string }[] = [
    { name: "Gate Valve", prefix: "GV" },
    { name: "Globe Valve", prefix: "GLV" },
    { name: "Ball Valve", prefix: "BV" },
    { name: "Butterfly Valve", prefix: "BFV" },
    { name: "Check Valve", prefix: "CHV" },
    { name: "Control Valve", prefix: "CTV" },
    { name: "Safety Relief Valve", prefix: "SRV" },
    { name: "Actuator", prefix: "ACT" },
  ];
  const created: { id: number; serialNumber: string; categoryId: number }[] = [];
  let serialIndex = 1;
  for (const t of itemTemplates) {
    const category = categories[serialIndex % categories.length];
    for (let i = 0; i < 35; i++) {
      const serial = `${t.prefix}-${String(serialIndex).padStart(4, "0")}`;
      const imagePath =
        dummyPath != null
          ? copyDummyToItemMaster(storageRoot, serial, dummyPath)
          : null;
      const item = await prisma.item.create({
        data: {
          itemName: `${t.name} ${i + 1}`,
          serialNumber: serial,
          description: `Valve manufacturing - ${t.name}`,
          image: imagePath,
          categoryId: category.id,
          status: ItemStatus.AVAILABLE,
          isActive: true,
        },
      });
      created.push({
        id: item.id,
        serialNumber: serial,
        categoryId: category.id,
      });
      serialIndex++;
    }
  }
  console.log(`  Items: ${created.length}`);
  return created;
}

async function seedIssues(
  itemIds: { id: number; serialNumber: string }[],
  userId: number
) {
  const companies = await prisma.company.findMany({ where: { isActive: true } });
  const contractors = await prisma.contractor.findMany({ where: { isActive: true } });
  const machines = await prisma.machine.findMany({ where: { isActive: true } });
  const locations = await prisma.location.findMany({ where: { isActive: true } });
  if (
    companies.length === 0 ||
    contractors.length === 0 ||
    machines.length === 0 ||
    locations.length === 0
  )
    throw new Error("Missing masters");
  const issueCount = Math.min(280, Math.max(200, itemIds.length));
  const issuedItemIds = new Set<number>();
  const issues: { id: number; issueNo: string; itemId: number; serialNumber: string }[] = [];
  let issueNum = 1;
  for (let i = 0; i < itemIds.length && issues.length < issueCount; i++) {
    const item = itemIds[i];
    if (issuedItemIds.has(item.id)) continue;
    const issueNo = `OUT-${String(issueNum).padStart(3, "0")}`;
    const company = companies[i % companies.length];
    const contractor = contractors[i % contractors.length];
    const machine = machines[i % machines.length];
    const location = locations[i % locations.length];
    const issue = await prisma.issue.create({
      data: {
        issueNo,
        itemId: item.id,
        issuedBy: userId,
        issuedTo: `Operator ${(i % 20) + 1}`,
        remarks: i % 5 === 0 ? "Routine issue" : null,
        companyId: company.id,
        contractorId: contractor.id,
        machineId: machine.id,
        locationId: location.id,
        isActive: true,
        isReturned: false,
      },
    });
    await prisma.item.update({
      where: { id: item.id },
      data: { status: ItemStatus.ISSUED },
    });
    issuedItemIds.add(item.id);
    issues.push({
      id: issue.id,
      issueNo,
      itemId: item.id,
      serialNumber: item.serialNumber,
    });
    issueNum++;
  }
  console.log(`  Issues (outward): ${issues.length}`);
  return issues;
}

async function seedReturns(
  issues: { id: number; issueNo: string; itemId: number; serialNumber: string }[],
  userId: number,
  storageRoot: string,
  dummyPath: string | null
) {
  const statuses = await prisma.status.findMany({ where: { isActive: true } });
  const statusAvailable = statuses.find((s) => s.name === "Available");
  const statusMissing = statuses.find((s) => s.name === "Missing");
  const returnCount = Math.floor(issues.length * 0.65);
  let returnNum = 1;
  for (let i = 0; i < returnCount; i++) {
    const issue = issues[i];
    const condition = CONDITIONS[i % CONDITIONS.length];
    const returnCode = `INWARD-${String(returnNum).padStart(3, "0")}`;
    const imagePath =
      dummyPath != null
        ? copyDummyToInward(
            storageRoot,
            issue.serialNumber,
            `inward-issue-${issue.id}-${Date.now()}.webp`,
            dummyPath
          )
        : null;
    await prisma.return.create({
      data: {
        returnCode,
        issueId: issue.id,
        itemId: null,
        condition,
        returnedBy: userId,
        returnImage: imagePath,
        remarks: i % 3 === 0 ? "Returned as received" : null,
        receivedBy: i % 4 === 0 ? `Receiver ${(i % 10) + 1}` : null,
        statusId:
          condition === "Missing"
            ? statusMissing?.id ?? null
            : statusAvailable?.id ?? null,
        isActive: true,
      },
    });
    await prisma.issue.update({
      where: { id: issue.id },
      data: { isReturned: true },
    });
    const newStatus =
      condition === "Missing" ? ItemStatus.MISSING : ItemStatus.AVAILABLE;
    await prisma.item.update({
      where: { id: issue.itemId },
      data: { status: newStatus },
    });
    returnNum++;
  }
  console.log(`  Returns (inward): ${returnCount}`);
  // Inward entries from issues carry company, contractor, machine, location via the linked issue
  // (return.issue.company, return.issue.contractor, return.issue.machine, return.issue.location).
}

async function seedMissingItemReturns(
  userId: number,
  storageRoot: string,
  dummyPath: string | null
) {
  const missingItems = await prisma.item.findMany({
    where: { status: ItemStatus.MISSING, isActive: true },
    take: 15,
  });
  const [statuses, companies, contractors, machines, locations] = await Promise.all([
    prisma.status.findMany({ where: { isActive: true } }),
    prisma.company.findMany({ where: { isActive: true } }),
    prisma.contractor.findMany({ where: { isActive: true } }),
    prisma.machine.findMany({ where: { isActive: true } }),
    prisma.location.findMany({ where: { isActive: true } }),
  ]);
  const statusAvailable = statuses.find((s) => s.name === "Available");
  const returnCount = await prisma.return.count();
  let returnNum = returnCount + 1;
  for (let i = 0; i < Math.min(10, missingItems.length); i++) {
    const item = missingItems[i];
    const serial = item.serialNumber ?? `item-${item.id}`;
    const returnCode = `INWARD-${String(returnNum).padStart(3, "0")}`;
    const condition = i % 2 === 0 ? "OK" : "Damaged";
    const imagePath =
      dummyPath != null
        ? copyDummyToInward(
            storageRoot,
            serial,
            `inward-missing-${item.id}-${Date.now()}.webp`,
            dummyPath
          )
        : null;
    const company = companies[i % companies.length];
    const contractor = contractors[i % contractors.length];
    const machine = machines[i % machines.length];
    const location = locations[i % locations.length];
    await prisma.return.create({
      data: {
        returnCode,
        issueId: null,
        itemId: item.id,
        condition,
        returnedBy: userId,
        returnImage: imagePath,
        remarks: "Received missing item",
        statusId: statusAvailable?.id ?? null,
        isActive: true,
        companyId: company?.id ?? null,
        contractorId: contractor?.id ?? null,
        machineId: machine?.id ?? null,
        locationId: location?.id ?? null,
      },
    });
    await prisma.item.update({
      where: { id: item.id },
      data: { status: ItemStatus.AVAILABLE },
    });
    returnNum++;
  }
  console.log(`  Returns (receive missing item): ${Math.min(10, missingItems.length)}`);
}

async function cleanDatabase() {
  console.log("Cleaning returns, issues, and items...");
  const deletedReturns = await prisma.return.deleteMany({});
  const deletedIssues = await prisma.issue.deleteMany({});
  const deletedItems = await prisma.item.deleteMany({});
  console.log(`  Deleted: ${deletedReturns.count} returns, ${deletedIssues.count} issues, ${deletedItems.count} items.\n`);
}

async function main() {
  console.log("Starting mass seed (valve manufacturing)...\n");

  if (CLEAN_BEFORE_SEED) {
    await cleanDatabase();
  } else {
    const existingItems = await prisma.item.count();
    if (existingItems > 0) {
      console.log(
        "Database already has items. To re-run mass seed, run: npm run seed:fresh\n"
      );
      return;
    }
  }

  const dummyPath = getDummyImagePath();
  if (dummyPath == null) {
    console.warn(
      "Warning: dummy_image.webp not found. Place it at frontend/public/assets/dummy_image.webp or backend/seed-assets/dummy_image.webp. Item/return images will be null.\n"
    );
  } else {
    console.log(`Using dummy image: ${dummyPath}\n`);
  }

  const storageRoot = path.resolve(process.cwd(), "storage");
  ensureStorageDir(path.join(storageRoot, "items"));

  if ((await prisma.appSettings.count()) === 0) {
    await prisma.appSettings.create({ data: { companyName: "QC Item System" } });
    console.log("  App settings created.");
  }
  if ((await prisma.rolePermission.count()) === 0) {
    const perms = [
      { role: "QC_ADMIN", viewDashboard: true, viewMaster: true, viewOutward: true, viewInward: true, viewReports: true, importExportMaster: true, addOutward: true, editOutward: true, addInward: true, editInward: true, addMaster: true, editMaster: true, manageUsers: true, accessSettings: true },
      { role: "QC_MANAGER", viewDashboard: true, viewMaster: true, viewOutward: true, viewInward: true, viewReports: true, importExportMaster: true, addOutward: true, editOutward: true, addInward: true, editInward: true, addMaster: true, editMaster: true, manageUsers: false, accessSettings: false },
      { role: "QC_USER", viewDashboard: true, viewMaster: true, viewOutward: true, viewInward: true, viewReports: true, importExportMaster: false, addOutward: true, editOutward: true, addInward: true, editInward: true, addMaster: true, editMaster: true, manageUsers: false, accessSettings: false },
    ];
    for (const p of perms) await prisma.rolePermission.create({ data: p });
    console.log("  Role permissions created.");
  }

  await ensureUsers();
  const user = await prisma.user.findFirst({ where: { isActive: true } });
  if (!user) throw new Error("No user for issues/returns");

  await seedStatuses();
  await seedItemCategories();
  await seedCompanies();
  await seedContractors();
  await seedMachines();
  await seedLocations();

  console.log("Seeding items...");
  const items = await seedItems(storageRoot, dummyPath);

  console.log("Seeding issues (outward)...");
  const issues = await seedIssues(items, user.id);

  console.log("Seeding returns (inward from issues)...");
  await seedReturns(issues, user.id, storageRoot, dummyPath);

  console.log("Seeding returns (receive missing item)...");
  await seedMissingItemReturns(user.id, storageRoot, dummyPath);

  console.log("\nMass seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
