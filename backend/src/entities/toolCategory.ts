import { prisma } from "../external-libraries/dbClient";

type CreateToolCategoryInput = {
  name: string;
};

export type ToolCategoryRecord = {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

const ToolCategory = {
  create: async (data: CreateToolCategoryInput): Promise<ToolCategoryRecord> => {
    await prisma.$executeRaw`
      INSERT INTO tool_categories (name, createdAt, updatedAt)
      VALUES (${data.name}, NOW(), NOW())
    `;
    const idResult = await prisma.$queryRaw<[{ id: number }]>`SELECT LAST_INSERT_ID() as id`;
    const id = Number(idResult[0]?.id ?? 0);
    const inserted = await prisma.$queryRaw<ToolCategoryRecord[]>`
      SELECT id, name, createdAt, updatedAt FROM tool_categories WHERE id = ${id}
    `;
    if (!inserted[0]) throw new Error("Failed to create tool category");
    return inserted[0];
  },

  findAll: async (): Promise<ToolCategoryRecord[]> => {
    return prisma.$queryRaw<ToolCategoryRecord[]>`
      SELECT id, name, createdAt, updatedAt FROM tool_categories ORDER BY name ASC
    `;
  },

  findById: async (id: number): Promise<ToolCategoryRecord | null> => {
    const rows = await prisma.$queryRaw<ToolCategoryRecord[]>`
      SELECT id, name, createdAt, updatedAt FROM tool_categories WHERE id = ${id}
    `;
    return rows[0] ?? null;
  },

  findByName: async (name: string): Promise<ToolCategoryRecord | null> => {
    const rows = await prisma.$queryRaw<ToolCategoryRecord[]>`
      SELECT id, name, createdAt, updatedAt FROM tool_categories WHERE name = ${name}
    `;
    return rows[0] ?? null;
  },

  delete: async (id: number): Promise<void> => {
    await prisma.$executeRaw`DELETE FROM tool_categories WHERE id = ${id}`;
  },

  nameExists: async (name: string): Promise<boolean> => {
    const rows = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM tool_categories WHERE name = ${name}
    `;
    const count = Number(rows[0]?.count ?? 0);
    return count > 0;
  },

  getCount: async (): Promise<number> => {
    const rows = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM tool_categories
    `;
    return Number(rows[0]?.count ?? 0);
  },
};

export default ToolCategory;
