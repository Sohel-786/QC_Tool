import { prisma } from "../external-libraries/dbClient";

type CreateContractorInput = {
  code: string;
  name: string;
  isActive?: boolean;
};

type UpdateContractorInput = {
  code?: string;
  name?: string;
  isActive?: boolean;
};

const Contractor = {
  create: async (data: CreateContractorInput) => {
    return prisma.contractor.create({
      data,
    });
  },

  findById: async (id: number) => {
    return prisma.contractor.findUnique({
      where: { id },
    });
  },

  findByCode: async (code: string) => {
    return prisma.contractor.findUnique({
      where: { code },
    });
  },

  findAll: async () => {
    return prisma.contractor.findMany({
      orderBy: { name: "asc" },
    });
  },

  findActive: async () => {
    return prisma.contractor.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  },

  update: async (id: number, data: UpdateContractorInput) => {
    return prisma.contractor.update({
      where: { id },
      data,
    });
  },

  codeExists: async (code: string): Promise<boolean> => {
    const count = await prisma.contractor.count({
      where: { code },
    });
    return count > 0;
  },

  getCount: async (): Promise<number> => {
    return prisma.contractor.count();
  },
};

export default Contractor;
