import { prisma } from "../external-libraries/dbClient";

type CreateReturnInput = {
  issueId: number;
  returnedBy: number;
  returnImage: string;
  remarks?: string;
};

const Return = {
  create: async (data: CreateReturnInput) => {
    return prisma.return.create({
      data,
      include: {
        issue: {
          include: {
            tool: true,
            division: true,
          },
        },
        returnedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  },

  findById: async (id: number) => {
    return prisma.return.findUnique({
      where: { id },
      include: {
        issue: {
          include: {
            tool: true,
            division: true,
          },
        },
        returnedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  },

  findAll: async () => {
    return prisma.return.findMany({
      include: {
        issue: {
          include: {
            tool: true,
            division: true,
          },
        },
        returnedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { returnedAt: 'desc' },
    });
  },

  findByIssueId: async (issueId: number) => {
    return prisma.return.findMany({
      where: { issueId },
      include: {
        returnedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { returnedAt: 'desc' },
    });
  },
};

export default Return;
