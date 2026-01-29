import { prisma } from "../external-libraries/dbClient";

type CreateItemCategoryInput = {
  code: string;
  name: string;
  isActive?: boolean;
};

type UpdateItemCategoryInput = {
  code?: string;
  name?: string;
  isActive?: boolean;
};

const ItemCategory = {
  create: async (data: CreateItemCategoryInput) => {
    return prisma.itemCategory.create({
      data,
    });
  },

  findById: async (id: number) => {
    return prisma.itemCategory.findUnique({
      where: { id },
    });
  },

  findByCode: async (code: string) => {
    return prisma.itemCategory.findUnique({
      where: { code },
    });
  },

  findByName: async (name: string) => {
    return prisma.itemCategory.findUnique({
      where: { name },
    });
  },

  findAll: async () => {
    return prisma.itemCategory.findMany({
      orderBy: { name: "asc" },
    });
  },

  findActive: async () => {
    return prisma.itemCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  },

  update: async (id: number, data: UpdateItemCategoryInput) => {
    return prisma.itemCategory.update({
      where: { id },
      data,
    });
  },

  codeExists: async (code: string): Promise<boolean> => {
    const count = await prisma.itemCategory.count({
      where: { code },
    });
    return count > 0;
  },

  nameExists: async (name: string): Promise<boolean> => {
    const count = await prisma.itemCategory.count({
      where: { name },
    });
    return count > 0;
  },

  getCount: async (): Promise<number> => {
    return prisma.itemCategory.count();
  },
};

export default ItemCategory;
