// Standalone seed script - can be run independently
// Usage: npx ts-node src/database/seed-standalone.ts
// Make sure to run: npm run generate-schema && npx prisma generate first

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function main() {
  try {
    console.log('🌱 Starting database seed...');

    // Check if users already exist
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      console.log('✅ Database already seeded');
      return;
    }

    // Create default manager
    const managerPassword = await hashPassword('password123');
    await prisma.user.create({
      data: {
        username: 'qc_manager',
        password: managerPassword,
        firstName: 'QC',
        lastName: 'Manager',
        role: Role.QC_MANAGER,
        isActive: true,
      },
    });

    // Create default user
    const userPassword = await hashPassword('password123');
    await prisma.user.create({
      data: {
        username: 'qc_user',
        password: userPassword,
        firstName: 'QC',
        lastName: 'User',
        role: Role.QC_USER,
        isActive: true,
      },
    });

    console.log('✅ Database seeded successfully');
    console.log('👤 Manager: qc_manager / password123');
    console.log('👤 User: qc_user / password123');
  } catch (error: any) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
