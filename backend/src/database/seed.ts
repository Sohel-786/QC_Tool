import { prisma } from '../external-libraries/dbClient';
import { hashPassword } from '../utils/auth';
import { Role } from '@prisma/client';

export async function seedDatabase() {
  try {
    const existingUsers = await prisma.user.count();
    if (existingUsers === 0) {
      console.log('Seeding database with default users...');

      const managerPassword = await hashPassword('password123');
      const userPassword = await hashPassword('password123');
      const adminPassword = await hashPassword('admin123');

      await prisma.user.create({
        data: {
          username: 'qc_admin',
          password: adminPassword,
          firstName: 'QC',
          lastName: 'Admin',
          role: Role.QC_ADMIN,
          isActive: true,
        },
      });

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

      console.log('Default users created.');
      console.log('Admin: qc_admin / admin123');
      console.log('Manager: qc_manager / password123');
      console.log('User: qc_user / password123');
    } else {
      // Existing DB: ensure at least one admin exists (e.g. after adding QC_ADMIN role)
      const adminCount = await prisma.user.count({
        where: { role: Role.QC_ADMIN },
      });
      if (adminCount === 0) {
        const existingAdminUsername = await prisma.user.findUnique({
          where: { username: 'qc_admin' },
        });
        if (!existingAdminUsername) {
          const adminPassword = await hashPassword('admin123');
          await prisma.user.create({
            data: {
              username: 'qc_admin',
              password: adminPassword,
              firstName: 'QC',
              lastName: 'Admin',
              role: Role.QC_ADMIN,
              isActive: true,
            },
          });
          console.log('Default admin user created: qc_admin / admin123');
        }
      }
    }

    // Seed app settings (single row) if empty
    const appSettingsCount = await prisma.appSettings.count();
    if (appSettingsCount === 0) {
      await prisma.appSettings.create({
        data: { companyName: 'QC Item System' },
      });
      console.log('App settings created.');
    }

    // Seed role permissions if empty
    const permCount = await prisma.rolePermission.count();
    if (permCount === 0) {
      const defaults = [
        {
          role: 'QC_ADMIN',
          viewDashboard: true,
          viewMaster: true,
          viewOutward: true,
          viewInward: true,
          viewReports: true,
          importExportMaster: true,
          addOutward: true,
          editOutward: true,
          addInward: true,
          editInward: true,
          addMaster: true,
          editMaster: true,
          manageUsers: true,
          accessSettings: true,
        },
        {
          role: 'QC_MANAGER',
          viewDashboard: true,
          viewMaster: true,
          viewOutward: true,
          viewInward: true,
          viewReports: true,
          importExportMaster: true,
          addOutward: true,
          editOutward: true,
          addInward: true,
          editInward: true,
          addMaster: true,
          editMaster: true,
          manageUsers: false,
          accessSettings: false,
        },
        {
          role: 'QC_USER',
          viewDashboard: true,
          viewMaster: true,
          viewOutward: true,
          viewInward: true,
          viewReports: true,
          importExportMaster: false,
          addOutward: true,
          editOutward: true,
          addInward: true,
          editInward: true,
          addMaster: true,
          editMaster: true,
          manageUsers: false,
          accessSettings: false,
        },
      ];
      for (const p of defaults) {
        await prisma.rolePermission.create({ data: p });
      }
      console.log('Role permissions created.');
    }

    console.log('Database seed completed.');
  } catch (error: any) {
    console.error('Error seeding database:', error);
    throw error;
  }
}
