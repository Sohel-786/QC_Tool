import { prisma } from "../external-libraries/dbClient";
import type { Prisma } from "@prisma/client";
import type { TransactionListFilters } from "../types/filter";

const CONDITION_VALUES = ["OK", "Damaged", "Calibration Required", "Missing"] as const;
export type ReturnCondition = (typeof CONDITION_VALUES)[number];

type CreateReturnInput = {
  returnCode: string;
  condition: ReturnCondition;
  returnedBy: number;
  remarks?: string;
  receivedBy?: string;
  statusId?: number | null;
  /** When inward is from an outward (issue) */
  issueId?: number | null;
  /** When inward is "receive missing item" */
  itemId?: number | null;
  /** Required when from issue and condition !== Missing; optional when from missing item */
  returnImage?: string | null;
};

const returnCreateInclude = {
  issue: {
    include: {
      item: true,
      company: true,
      contractor: true,
      machine: true,
    },
  },
  item: true,
  returnedByUser: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
    },
  },
  status: true,
} as const;

const Return = {
  create: async (data: CreateReturnInput) => {
    return prisma.return.create({
      data: {
        returnCode: data.returnCode,
        condition: data.condition,
        returnedBy: data.returnedBy,
        remarks: data.remarks,
        receivedBy: data.receivedBy,
        statusId: data.statusId ?? undefined,
        issueId: data.issueId ?? undefined,
        itemId: data.itemId ?? undefined,
        returnImage: data.returnImage ?? undefined,
      } as unknown as Prisma.ReturnUncheckedCreateInput,
      include: returnCreateInclude as unknown as Prisma.ReturnInclude,
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
        item: true,
        status: true,
        returnedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      } as unknown as Prisma.ReturnInclude,
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
        item: true,
        status: true,
        returnedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      } as unknown as Prisma.ReturnInclude,
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
        { condition: { contains: searchTerm } } as unknown as Prisma.ReturnWhereInput,
        { status: { name: { contains: searchTerm } } },
        { issue: { issueNo: { contains: searchTerm } } },
        { issue: { item: { itemName: { contains: searchTerm } } } },
        { issue: { item: { serialNumber: { contains: searchTerm } } } },
        { issue: { company: { name: { contains: searchTerm } } } },
        { issue: { contractor: { name: { contains: searchTerm } } } },
        { issue: { machine: { name: { contains: searchTerm } } } },
        { issue: { issuedTo: { contains: searchTerm } } },
        { item: { itemName: { contains: searchTerm } } } as unknown as Prisma.ReturnWhereInput,
        { item: { serialNumber: { contains: searchTerm } } } as unknown as Prisma.ReturnWhereInput,
      );
    }
    const andParts: Prisma.ReturnWhereInput[] = [];
    if (filters.status === "active") andParts.push({ isActive: true } as Prisma.ReturnWhereInput);
    if (filters.status === "inactive") andParts.push({ isActive: false } as Prisma.ReturnWhereInput);
    if (Object.keys(issueWhere).length > 0) {
      const orParts: Prisma.ReturnWhereInput[] = [{ issue: issueWhere }];
      if (filters.itemIds.length > 0) {
        orParts.push({ issueId: { equals: null }, itemId: { in: filters.itemIds } } as unknown as Prisma.ReturnWhereInput);
      }
      andParts.push({ OR: orParts });
    } else if (filters.itemIds.length > 0) {
      andParts.push({
        OR: [
          { issue: { itemId: { in: filters.itemIds } } },
          { issueId: { equals: null }, itemId: { in: filters.itemIds } } as unknown as Prisma.ReturnWhereInput,
        ],
      });
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
        item: true,
        status: true,
        returnedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      } as unknown as Prisma.ReturnInclude,
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
    data: { remarks?: string; receivedBy?: string; statusId?: number | null; condition?: string }
  ) => {
    const updatePayload = {
      ...(data.remarks !== undefined && { remarks: data.remarks }),
      ...(data.receivedBy !== undefined && { receivedBy: data.receivedBy }),
      ...(data.statusId !== undefined && { statusId: data.statusId ?? undefined }),
      ...(data.condition !== undefined && { condition: data.condition }),
    } as Prisma.ReturnUncheckedUpdateInput;
    return prisma.return.update({
      where: { id },
      data: updatePayload,
      include: {
        issue: {
          include: {
            item: true,
            company: true,
            contractor: true,
            machine: true,
          },
        },
        item: true,
        status: true,
        returnedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      } as unknown as Prisma.ReturnInclude,
    });
  },

  setActive: async (id: number) => {
    return prisma.return.update({
      where: { id },
      data: { isActive: true } as Prisma.ReturnUpdateInput,
      include: {
        issue: { include: { item: true, company: true, contractor: true, machine: true } },
        item: true,
        status: true,
        returnedByUser: { select: { id: true, username: true, firstName: true, lastName: true } },
      } as unknown as Prisma.ReturnInclude,
    });
  },

  setInactive: async (id: number) => {
    return prisma.return.update({
      where: { id },
      data: { isActive: false } as Prisma.ReturnUpdateInput,
      include: {
        issue: { include: { item: true, company: true, contractor: true, machine: true } },
        item: true,
        status: true,
        returnedByUser: { select: { id: true, username: true, firstName: true, lastName: true } },
      } as unknown as Prisma.ReturnInclude,
    });
  },

  getCount: async (): Promise<number> => {
    return prisma.return.count();
  },
};

export default Return;
