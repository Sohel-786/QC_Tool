import { ItemStatus } from "@prisma/client";
import { prisma } from "../external-libraries/dbClient";

type CreateItemInput = {
  itemName: string;
  serialNumber?: string | null;
  description?: string | null;
  image?: string | null;
  categoryId?: number | null;
  isActive?: boolean;
};

type UpdateItemInput = {
  itemName?: string;
  serialNumber?: string | null;
  description?: string | null;
  image?: string | null;
  status?: ItemStatus;
  categoryId?: number | null;
  isActive?: boolean;
};

const Item = {
  create: async (data: CreateItemInput) => {
    return prisma.item.create({
      data: {
        itemName: data.itemName,
        serialNumber: data.serialNumber ?? null,
        description: data.description ?? null,
        image: data.image ?? null,
        categoryId: data.categoryId ?? null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  },

  findById: async (id: number) => {
    return prisma.item.findUnique({
      where: { id },
      include: { issues: true },
    });
  },

  findAll: async (status?: ItemStatus, isActive?: boolean) => {
    const where: { status?: ItemStatus; isActive?: boolean } = {};
    if (status != null) where.status = status;
    if (isActive !== undefined) where.isActive = isActive;
    return prisma.item.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { createdAt: "desc" },
    });
  },

  findActive: async (status?: ItemStatus) => {
    const where: { isActive: boolean; status?: ItemStatus } = { isActive: true };
    if (status != null) where.status = status;
    return prisma.item.findMany({
      where,
      orderBy: { itemName: "asc" },
    });
  },

  findAvailable: async () => {
    return prisma.item.findMany({
      where: { status: ItemStatus.AVAILABLE, isActive: true },
      orderBy: { itemName: "asc" },
    });
  },

  findActiveByCategory: async (categoryId: number) => {
    return prisma.item.findMany({
      where: { categoryId, isActive: true },
      orderBy: { itemName: "asc" },
    });
  },

  update: async (id: number, data: UpdateItemInput) => {
    return prisma.item.update({
      where: { id },
      data,
    });
  },

  serialNumberExists: async (serialNumber: string): Promise<boolean> => {
    const count = await prisma.item.count({ where: { serialNumber } });
    return count > 0;
  },

  serialNumberExistsExcluding: async (
    serialNumber: string,
    excludeId: number
  ): Promise<boolean> => {
    const count = await prisma.item.count({
      where: { serialNumber, id: { not: excludeId } },
    });
    return count > 0;
  },

  countIssuesByItemId: async (itemId: number): Promise<number> => {
    return prisma.issue.count({ where: { itemId } });
  },

  getCount: async (): Promise<number> => {
    return prisma.item.count();
  },
};

export default Item;
