import { prisma } from "../external-libraries/dbClient";

type CreateContractorInput = {
  name: string;
  isActive?: boolean;
};

type UpdateContractorInput = {
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

  getCount: async (): Promise<number> => {
    return prisma.contractor.count();
  },
};

export default Contractor;
