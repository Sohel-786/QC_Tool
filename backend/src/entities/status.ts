import { prisma } from "../external-libraries/dbClient";

type CreateStatusInput = {
  code: string;
  name: string;
  isActive?: boolean;
};

type UpdateStatusInput = {
  code?: string;
  name?: string;
  isActive?: boolean;
};

const Status = {
  create: async (data: CreateStatusInput) => {
    return prisma.status.create({
      data,
    });
  },

  findById: async (id: number) => {
    return prisma.status.findUnique({
      where: { id },
    });
  },

  findByCode: async (code: string) => {
    return prisma.status.findUnique({
      where: { code },
    });
  },

  findAll: async () => {
    return prisma.status.findMany({
      orderBy: { name: "asc" },
    });
  },

  findActive: async () => {
    return prisma.status.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  },

  update: async (id: number, data: UpdateStatusInput) => {
    return prisma.status.update({
      where: { id },
      data,
    });
  },

  codeExists: async (code: string): Promise<boolean> => {
    const count = await prisma.status.count({
      where: { code },
    });
    return count > 0;
  },

  getCount: async (): Promise<number> => {
    return prisma.status.count();
  },
};

export default Status;
