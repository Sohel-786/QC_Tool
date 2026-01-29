import { prisma } from "../external-libraries/dbClient";

type CreateIssueInput = {
  issueNo: string;
  itemId: number;
  issuedBy: number;
  issuedTo?: string;
  remarks?: string;
  companyId?: number;
  contractorId?: number;
  machineId?: number;
};

const Issue = {
  create: async (data: CreateIssueInput) => {
    return prisma.issue.create({
      data: {
        issueNo: data.issueNo,
        itemId: data.itemId,
        issuedBy: data.issuedBy,
        issuedTo: data.issuedTo ?? null,
        remarks: data.remarks ?? null,
        companyId: data.companyId ?? null,
        contractorId: data.contractorId ?? null,
        machineId: data.machineId ?? null,
      },
      include: {
        item: true,
        company: true,
        contractor: true,
        machine: true,
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
        item: true,
        company: true,
        contractor: true,
        machine: true,
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
        item: true,
        company: true,
        contractor: true,
        machine: true,
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
        item: true,
        company: true,
        contractor: true,
        machine: true,
        issuedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    });
  },

  findActive: async () => {
    return prisma.issue.findMany({
      where: { isReturned: false },
      include: {
        item: true,
        company: true,
        contractor: true,
        machine: true,
        issuedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { issuedAt: "desc" },
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
    const sequence = String(count + 1).padStart(3, "0");
    return `OUTWARD-${sequence}`;
  },

  getCount: async (): Promise<number> => {
    return prisma.issue.count();
  },
};

export default Issue;
