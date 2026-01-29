import { prisma } from "../external-libraries/dbClient";

type CreateCompanyInput = {
  name: string;
  isActive?: boolean;
};

type UpdateCompanyInput = {
  name?: string;
  isActive?: boolean;
};

const Company = {
  create: async (data: CreateCompanyInput) => {
    return prisma.company.create({
      data,
    });
  },

  findById: async (id: number) => {
    return prisma.company.findUnique({
      where: { id },
    });
  },

  findAll: async () => {
    return prisma.company.findMany({
      orderBy: { name: "asc" },
    });
  },

  findActive: async () => {
    return prisma.company.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  },

  update: async (id: number, data: UpdateCompanyInput) => {
    return prisma.company.update({
      where: { id },
      data,
    });
  },

  getCount: async (): Promise<number> => {
    return prisma.company.count();
  },
};

export default Company;
