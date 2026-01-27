import { ToolStatus } from "@prisma/client";
import { prisma } from "../external-libraries/dbClient";

type CreateToolInput = {
  toolCode: string;
  toolName: string;
  description?: string;
};

type UpdateToolInput = {
  toolCode?: string;
  toolName?: string;
  description?: string;
  status?: ToolStatus;
};

const Tool = {
  create: async (data: CreateToolInput) => {
    return prisma.tool.create({
      data,
    });
  },

  findById: async (id: number) => {
    return prisma.tool.findUnique({
      where: { id },
      include: { issues: true },
    });
  },

  findByCode: async (toolCode: string) => {
    return prisma.tool.findUnique({
      where: { toolCode },
    });
  },

  findAll: async (status?: ToolStatus) => {
    const where = status ? { status } : {};
    return prisma.tool.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  },

  findAvailable: async () => {
    return prisma.tool.findMany({
      where: { status: ToolStatus.AVAILABLE },
      orderBy: { toolName: 'asc' },
    });
  },

  update: async (id: number, data: UpdateToolInput) => {
    return prisma.tool.update({
      where: { id },
      data,
    });
  },

  updateStatus: async (id: number, status: ToolStatus) => {
    return prisma.tool.update({
      where: { id },
      data: { status },
    });
  },

  codeExists: async (toolCode: string): Promise<boolean> => {
    const count = await prisma.tool.count({
      where: { toolCode },
    });
    return count > 0;
  },
};

export default Tool;
