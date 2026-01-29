import { prisma } from "../external-libraries/dbClient";

type CreateLocationInput = {
  name: string;
  isActive?: boolean;
};

type UpdateLocationInput = {
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

  getCount: async (): Promise<number> => {
    return prisma.location.count();
  },
};

export default Location;
