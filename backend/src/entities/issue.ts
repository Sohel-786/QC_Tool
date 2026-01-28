import { prisma } from "../external-libraries/dbClient";
import { ToolStatus } from "@prisma/client";

type CreateIssueInput = {
  issueNo: string;
  toolId: number;
  divisionId: number;
  issuedBy: number;
  issuedTo?: string;
  remarks?: string;
};

const Issue = {
  create: async (data: CreateIssueInput) => {
    return prisma.issue.create({
      data,
      include: {
        tool: true,
        division: true,
        issuedByUser: {
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
    return prisma.issue.findUnique({
      where: { id },
      include: {
        tool: true,
        division: true,
        issuedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        returns: {
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
        },
      },
    });
  },

  findByIssueNo: async (issueNo: string) => {
    return prisma.issue.findUnique({
      where: { issueNo },
      include: {
        tool: true,
        division: true,
        issuedByUser: {
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
    return prisma.issue.findMany({
      include: {
        tool: true,
        division: true,
        issuedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  },

  findActive: async () => {
    return prisma.issue.findMany({
      where: { isReturned: false },
      include: {
        tool: true,
        division: true,
        issuedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  },

  markAsReturned: async (id: number) => {
    return prisma.issue.update({
      where: { id },
      data: { isReturned: true },
    });
  },

  generateIssueNo: async (): Promise<string> => {
    const count = await prisma.issue.count();
    const sequence = String(count + 1).padStart(3, '0');
    return `OUTWARD-${sequence}`;
  },

  getCount: async (): Promise<number> => {
    return prisma.issue.count();
  },
};

export default Issue;
