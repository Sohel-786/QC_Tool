import { Role } from "@prisma/client";
import { prisma } from "../external-libraries/dbClient";

type CreateUserInput = {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive?: boolean;
  avatar?: string | null;
  createdBy?: number;
};

type UpdateUserInput = {
  username?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  isActive?: boolean;
  avatar?: string | null;
};

const User = {
  create: async (data: CreateUserInput) => {
    return prisma.user.create({
      data,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  findByUsername: async (username: string) => {
    return prisma.user.findUnique({
      where: { username },
    });
  },

  findById: async (id: number) => {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  findAll: async () => {
    return prisma.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  update: async (id: number, data: UpdateUserInput) => {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  usernameExists: async (username: string): Promise<boolean> => {
    const count = await prisma.user.count({
      where: { username },
    });
    return count > 0;
  },
};

export default User;
