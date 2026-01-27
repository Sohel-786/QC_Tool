import { prisma } from '../external-libraries/dbClient';
import { hashPassword } from '../utils/auth';
import { Role } from '@prisma/client';

export async function seedDatabase() {
  try {
    // Check if users already exist
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      console.log('✅ Database already seeded');
      return;
    }

    console.log('🌱 Seeding database with default users...');

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
  }
}
