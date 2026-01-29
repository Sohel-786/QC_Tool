import { prisma } from "../external-libraries/dbClient";

type CreateMachineInput = {
  name: string;
  isActive?: boolean;
};

type UpdateMachineInput = {
  name?: string;
  isActive?: boolean;
};

const Machine = {
  create: async (data: CreateMachineInput) => {
    return prisma.machine.create({
      data,
    });
  },

  findById: async (id: number) => {
    return prisma.machine.findUnique({
      where: { id },
    });
  },

  findAll: async () => {
    return prisma.machine.findMany({
      orderBy: { name: "asc" },
    });
  },

  findActive: async () => {
    return prisma.machine.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  },

  update: async (id: number, data: UpdateMachineInput) => {
    return prisma.machine.update({
      where: { id },
      data,
    });
  },

  getCount: async (): Promise<number> => {
    return prisma.machine.count();
  },
};

export default Machine;
