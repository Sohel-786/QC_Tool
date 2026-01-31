import { prisma } from "../external-libraries/dbClient";
import type { Prisma } from "@prisma/client";
import type { TransactionListFilters } from "../types/filter";

type CreateIssueInput = {
  issueNo: string;
  itemId: number;
  issuedBy: number;
  issuedTo?: string;
  remarks?: string;
  companyId: number;
  contractorId: number;
  machineId: number;
  locationId: number;
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
        companyId: data.companyId,
        contractorId: data.contractorId,
        machineId: data.machineId,
        locationId: data.locationId,
      },
      include: {
        item: true,
        company: true,
        contractor: true,
        machine: true,
        location: true,
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
        location: true,
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
        location: true,
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
        location: true,
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

  findAllFiltered: async (filters: TransactionListFilters) => {
    const conditions: Prisma.IssueWhereInput[] = [];
    if (filters.status === "active") conditions.push({ isActive: true });
    if (filters.status === "inactive") conditions.push({ isActive: false });
    if (filters.companyIds.length) conditions.push({ companyId: { in: filters.companyIds } });
    if (filters.contractorIds.length) conditions.push({ contractorId: { in: filters.contractorIds } });
    if (filters.machineIds.length) conditions.push({ machineId: { in: filters.machineIds } });
    if (filters.locationIds.length) conditions.push({ locationId: { in: filters.locationIds } });
    if (filters.itemIds.length) conditions.push({ itemId: { in: filters.itemIds } });
    if (filters.operatorName.length) {
      conditions.push({
        issuedTo: { contains: filters.operatorName },
      });
    }
    const searchTerm = filters.search?.trim() ?? "";
    if (searchTerm.length > 0) {
      conditions.push({
        OR: [
          { issueNo: { contains: searchTerm } },
          { item: { itemName: { contains: searchTerm } } },
          { item: { serialNumber: { contains: searchTerm } } },
          { company: { name: { contains: searchTerm } } },
          { contractor: { name: { contains: searchTerm } } },
          { machine: { name: { contains: searchTerm } } },
          { location: { name: { contains: searchTerm } } },
          { issuedTo: { contains: searchTerm } },
        ],
      });
    }
    const where: Prisma.IssueWhereInput = conditions.length ? { AND: conditions } : {};
    return prisma.issue.findMany({
      where,
      include: {
        item: true,
        company: true,
        contractor: true,
        machine: true,
        location: true,
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
        location: true,
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

  update: async (
    id: number,
    data: {
      issuedTo?: string | null;
      remarks?: string | null;
      companyId?: number;
      contractorId?: number;
      machineId?: number;
      locationId?: number;
      isActive?: boolean;
    }
  ) => {
    return prisma.issue.update({
      where: { id },
      data,
      include: {
        item: true,
        company: true,
        contractor: true,
        machine: true,
        location: true,
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
