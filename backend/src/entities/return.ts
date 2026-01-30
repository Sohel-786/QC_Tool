import { prisma } from "../external-libraries/dbClient";
import type { Prisma } from "@prisma/client";
import type { TransactionListFilters } from "../types/filter";

type CreateReturnInput = {
  returnCode: string;
  issueId: number;
  returnedBy: number;
  returnImage: string;
  remarks?: string;
  statusId: number;
};

const Return = {
  create: async (data: CreateReturnInput) => {
    return prisma.return.create({
      data,
      include: {
        issue: {
          include: {
            item: true,
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
            item: true,
            company: true,
            contractor: true,
            machine: true,
          },
        },
        status: true,
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
            item: true,
            company: true,
            contractor: true,
            machine: true,
          },
        },
        status: true,
        returnedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { returnedAt: "desc" },
    });
  },

  findAllFiltered: async (filters: TransactionListFilters) => {
    const conditions: Prisma.IssueWhereInput[] = [];
    if (filters.companyIds.length) conditions.push({ companyId: { in: filters.companyIds } });
    if (filters.contractorIds.length) conditions.push({ contractorId: { in: filters.contractorIds } });
    if (filters.machineIds.length) conditions.push({ machineId: { in: filters.machineIds } });
    if (filters.itemIds.length) conditions.push({ itemId: { in: filters.itemIds } });
    if (filters.operatorName.length) {
      conditions.push({
        issuedTo: { contains: filters.operatorName },
      });
    }
    const issueWhere: Prisma.IssueWhereInput = conditions.length ? { AND: conditions } : {};
    const searchTerm = filters.search?.trim() ?? "";
    const searchOrConditions: Prisma.ReturnWhereInput[] = [];
    if (searchTerm.length > 0) {
      searchOrConditions.push(
        { returnCode: { contains: searchTerm } },
        { status: { name: { contains: searchTerm } } },
        { issue: { issueNo: { contains: searchTerm } } },
        { issue: { item: { itemName: { contains: searchTerm } } } },
        { issue: { item: { serialNumber: { contains: searchTerm } } } },
        { issue: { company: { name: { contains: searchTerm } } } },
        { issue: { contractor: { name: { contains: searchTerm } } } },
        { issue: { machine: { name: { contains: searchTerm } } } },
        { issue: { issuedTo: { contains: searchTerm } } },
      );
    }
    const andParts: Prisma.ReturnWhereInput[] = [];
    if (filters.status === "active") andParts.push({ isActive: true } as Prisma.ReturnWhereInput);
    if (filters.status === "inactive") andParts.push({ isActive: false } as Prisma.ReturnWhereInput);
    if (Object.keys(issueWhere).length > 0) {
      andParts.push({ issue: issueWhere });
    }
    if (searchOrConditions.length > 0) {
      andParts.push({ OR: searchOrConditions });
    }
    const where: Prisma.ReturnWhereInput = andParts.length > 0 ? { AND: andParts } : {};
    return prisma.return.findMany({
      where,
      include: {
        issue: {
          include: {
            item: true,
            company: true,
            contractor: true,
            machine: true,
          },
        },
        status: true,
        returnedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { returnedAt: "desc" },
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
      orderBy: { returnedAt: "desc" },
    });
  },

  update: async (
    id: number,
    data: { remarks?: string; statusId?: number }
  ) => {
    return prisma.return.update({
      where: { id },
      data,
      include: {
        issue: {
          include: {
            item: true,
            company: true,
            contractor: true,
            machine: true,
          },
        },
        status: true,
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

  setActive: async (id: number) => {
    return prisma.return.update({
      where: { id },
      data: { isActive: true } as Prisma.ReturnUpdateInput,
      include: {
        issue: { include: { item: true, company: true, contractor: true, machine: true } },
        status: true,
        returnedByUser: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });
  },

  setInactive: async (id: number) => {
    return prisma.return.update({
      where: { id },
      data: { isActive: false } as Prisma.ReturnUpdateInput,
      include: {
        issue: { include: { item: true, company: true, contractor: true, machine: true } },
        status: true,
        returnedByUser: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });
  },

  getCount: async (): Promise<number> => {
    return prisma.return.count();
  },
};

export default Return;
