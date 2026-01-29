import { prisma } from "../external-libraries/dbClient";

type CreateStatusInput = {
  name: string;
  isActive?: boolean;
};

type UpdateStatusInput = {
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

  getCount: async (): Promise<number> => {
    return prisma.status.count();
  },
};

export default Status;
