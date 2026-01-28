import { prisma } from "../external-libraries/dbClient";

type CreateDivisionInput = {
  code: string;
  name: string;
  isActive?: boolean;
};

type UpdateDivisionInput = {
  code?: string;
  name?: string;
  isActive?: boolean;
};

const Division = {
  create: async (data: CreateDivisionInput) => {
    return prisma.division.create({
      data,
    });
  },

  findById: async (id: number) => {
    return prisma.division.findUnique({
      where: { id },
    });
  },

  findByCode: async (code: string) => {
    return prisma.division.findUnique({
      where: { code },
    });
  },

  findAll: async () => {
    return prisma.division.findMany({
      orderBy: { name: 'asc' },
    });
  },

  findActive: async () => {
    return prisma.division.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  },

  update: async (id: number, data: UpdateDivisionInput) => {
    return prisma.division.update({
      where: { id },
      data,
    });
  },

  codeExists: async (code: string): Promise<boolean> => {
    const count = await prisma.division.count({
      where: { code },
    });
    return count > 0;
  },

  countIssuesByDivisionId: async (divisionId: number): Promise<number> => {
    return prisma.issue.count({
      where: { divisionId },
    });
  },

  delete: async (id: number): Promise<void> => {
    await prisma.division.delete({
      where: { id },
    });
  },

  getCount: async (): Promise<number> => {
    return prisma.division.count();
  },
};

export default Division;
