import { prisma } from "../external-libraries/dbClient";

type CreateLocationInput = {
  code: string;
  name: string;
  isActive?: boolean;
};

type UpdateLocationInput = {
  code?: string;
  name?: string;
  isActive?: boolean;
};

const Location = {
  create: async (data: CreateLocationInput) => {
    return prisma.location.create({
      data,
    });
  },

  findById: async (id: number) => {
    return prisma.location.findUnique({
      where: { id },
    });
  },

  findByCode: async (code: string) => {
    return prisma.location.findUnique({
      where: { code },
    });
  },

  findAll: async () => {
    return prisma.location.findMany({
      orderBy: { name: "asc" },
    });
  },

  findActive: async () => {
    return prisma.location.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  },

  update: async (id: number, data: UpdateLocationInput) => {
    return prisma.location.update({
      where: { id },
      data,
    });
  },

  codeExists: async (code: string): Promise<boolean> => {
    const count = await prisma.location.count({
      where: { code },
    });
    return count > 0;
  },

  getCount: async (): Promise<number> => {
    return prisma.location.count();
  },
};

export default Location;
