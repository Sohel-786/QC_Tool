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
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        _count: { select: { issues: true } },
      },
    });
    if (!item) return null;
    const latestReturn = await prisma.return.findFirst({
      where: {
        OR: [{ itemId: item.id }, { issue: { itemId: item.id } }],
        isActive: true,
        returnImage: { not: null },
      },
      orderBy: { returnedAt: "desc" },
    });
    return {
      ...item,
      latestImage: latestReturn?.returnImage || item.image,
    };
  },

  findAll: async (status?: ItemStatus, isActive?: boolean) => {
    const where: { status?: ItemStatus; isActive?: boolean } = {};
    if (status != null) where.status = status;
    if (isActive !== undefined) where.isActive = isActive;
    const items = await prisma.item.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: {
        _count: { select: { issues: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(
      items.map(async (item) => {
        const latestReturn = await prisma.return.findFirst({
          where: {
            OR: [{ itemId: item.id }, { issue: { itemId: item.id } }],
            isActive: true,
            returnImage: { not: null },
          },
          orderBy: { returnedAt: "desc" },
        });
        return {
          ...item,
          latestImage: latestReturn?.returnImage || item.image,
        };
      })
    );
  },

  findActive: async (status?: ItemStatus) => {
    const where: { isActive: boolean; status?: ItemStatus } = { isActive: true };
    if (status != null) where.status = status;
    const items = await prisma.item.findMany({
      where,
      include: {
        _count: { select: { issues: true } },
      },
      orderBy: { itemName: "asc" },
    });

    return Promise.all(
      items.map(async (item) => {
        const latestReturn = await prisma.return.findFirst({
          where: {
            OR: [{ itemId: item.id }, { issue: { itemId: item.id } }],
            isActive: true,
            returnImage: { not: null },
          },
          orderBy: { returnedAt: "desc" },
        });
        return {
          ...item,
          latestImage: latestReturn?.returnImage || item.image,
        };
      })
    );
  },

  findAvailable: async () => {
    const items = await prisma.item.findMany({
      where: { status: ItemStatus.AVAILABLE, isActive: true },
      include: {
        _count: { select: { issues: true } },
      },
      orderBy: { itemName: "asc" },
    });

    return Promise.all(
      items.map(async (item) => {
        const latestReturn = await prisma.return.findFirst({
          where: {
            OR: [{ itemId: item.id }, { issue: { itemId: item.id } }],
            isActive: true,
            returnImage: { not: null },
          },
          orderBy: { returnedAt: "desc" },
        });
        return {
          ...item,
          latestImage: latestReturn?.returnImage || item.image,
        };
      })
    );
  },

  findActiveByCategory: async (categoryId: number) => {
    const items = await prisma.item.findMany({
      where: { categoryId, isActive: true },
      include: {
        _count: { select: { issues: true } },
      },
      orderBy: { itemName: "asc" },
    });

    return Promise.all(
      items.map(async (item) => {
        const latestReturn = await prisma.return.findFirst({
          where: {
            OR: [{ itemId: item.id }, { issue: { itemId: item.id } }],
            isActive: true,
            returnImage: { not: null },
          },
          orderBy: { returnedAt: "desc" },
        });
        return {
          ...item,
          latestImage: latestReturn?.returnImage || item.image,
        };
      })
    );
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
