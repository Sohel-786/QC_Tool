import { prisma } from "../external-libraries/dbClient";

export type PermissionRow = {
  role: string;
  viewDashboard: boolean;
  viewMaster: boolean;
  viewOutward: boolean;
  viewInward: boolean;
  viewReports: boolean;
  importExportMaster: boolean;
  addOutward: boolean;
  editOutward: boolean;
  addInward: boolean;
  editInward: boolean;
  addMaster: boolean;
  editMaster: boolean;
  manageUsers: boolean;
  accessSettings: boolean;
  navigationLayout: string;
};

const RolePermissionEntity = {
  getAll: async (): Promise<PermissionRow[]> => {
    const rows = await prisma.rolePermission.findMany({
      orderBy: { role: "asc" },
      select: {
        id: true,
        role: true,
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
        navigationLayout: true,
      },
    });
    return rows as PermissionRow[];
  },

  getByRole: async (role: string): Promise<PermissionRow | null> => {
    const row = await prisma.rolePermission.findUnique({
      where: { role },
      select: {
        id: true,
        role: true,
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
        navigationLayout: true,
      },
    });
    return row as PermissionRow | null;
  },

  upsert: async (role: string, data: Partial<PermissionRow>) => {
    return prisma.rolePermission.upsert({
      where: { role },
      create: {
        role,
        viewDashboard: data.viewDashboard ?? true,
        viewMaster: data.viewMaster ?? true,
        viewOutward: data.viewOutward ?? true,
        viewInward: data.viewInward ?? true,
        viewReports: data.viewReports ?? true,
        importExportMaster: data.importExportMaster ?? false,
        addOutward: data.addOutward ?? true,
        editOutward: data.editOutward ?? true,
        addInward: data.addInward ?? true,
        editInward: data.editInward ?? true,
        addMaster: data.addMaster ?? true,
        editMaster: data.editMaster ?? true,
        manageUsers: data.manageUsers ?? false,
        accessSettings: data.accessSettings ?? false,
        navigationLayout: data.navigationLayout ?? "VERTICAL",
      },
      update: {
        ...(data.viewDashboard !== undefined && { viewDashboard: data.viewDashboard }),
        ...(data.viewMaster !== undefined && { viewMaster: data.viewMaster }),
        ...(data.viewOutward !== undefined && { viewOutward: data.viewOutward }),
        ...(data.viewInward !== undefined && { viewInward: data.viewInward }),
        ...(data.viewReports !== undefined && { viewReports: data.viewReports }),
        ...(data.importExportMaster !== undefined && { importExportMaster: data.importExportMaster }),
        ...(data.addOutward !== undefined && { addOutward: data.addOutward }),
        ...(data.editOutward !== undefined && { editOutward: data.editOutward }),
        ...(data.addInward !== undefined && { addInward: data.addInward }),
        ...(data.editInward !== undefined && { editInward: data.editInward }),
        ...(data.addMaster !== undefined && { addMaster: data.addMaster }),
        ...(data.editMaster !== undefined && { editMaster: data.editMaster }),
        ...(data.manageUsers !== undefined && { manageUsers: data.manageUsers }),
        ...(data.accessSettings !== undefined && { accessSettings: data.accessSettings }),
        ...(data.navigationLayout !== undefined && { navigationLayout: data.navigationLayout }),
      },
    });
  },

  upsertMany: async (permissions: PermissionRow[]) => {
    const results = [];
    for (const p of permissions) {
      const { role, ...rest } = p;
      results.push(await RolePermissionEntity.upsert(role, rest));
    }
    return results;
  },
};

export default RolePermissionEntity;
