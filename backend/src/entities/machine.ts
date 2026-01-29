import { prisma } from "../external-libraries/dbClient";

type CreateMachineInput = {
  code: string;
  name: string;
  isActive?: boolean;
};

type UpdateMachineInput = {
  code?: string;
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

  findByCode: async (code: string) => {
    return prisma.machine.findUnique({
      where: { code },
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

  codeExists: async (code: string): Promise<boolean> => {
    const count = await prisma.machine.count({
      where: { code },
    });
    return count > 0;
  },

  getCount: async (): Promise<number> => {
    return prisma.machine.count();
  },
};

export default Machine;
