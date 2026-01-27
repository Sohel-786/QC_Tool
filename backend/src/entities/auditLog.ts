import { prisma } from "../external-libraries/dbClient";

type CreateAuditLogInput = {
  userId: number;
  action: string;
  entityType: string;
  entityId?: number;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
};

const AuditLog = {
  create: async (data: CreateAuditLogInput) => {
    return prisma.auditLog.create({
      data,
    });
  },

  findAll: async (limit: number = 100) => {
    return prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  findByEntity: async (entityType: string, entityId: number) => {
    return prisma.auditLog.findMany({
      where: { entityType, entityId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  findByUser: async (userId: number, limit: number = 100) => {
    return prisma.auditLog.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};

export default AuditLog;
