import { prisma } from "../external-libraries/dbClient";

type CreateCompanyInput = {
  code: string;
  name: string;
  isActive?: boolean;
};

type UpdateCompanyInput = {
  code?: string;
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

  findByCode: async (code: string) => {
    return prisma.company.findUnique({
      where: { code },
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

  codeExists: async (code: string): Promise<boolean> => {
    const count = await prisma.company.count({
      where: { code },
    });
    return count > 0;
  },

  getCount: async (): Promise<number> => {
    return prisma.company.count();
  },
};

export default Company;
