import { prisma } from "../external-libraries/dbClient";

type CreateAppSettingsInput = {
  companyName?: string;
  companyLogo?: string | null;
  softwareName?: string | null;
  primaryColor?: string | null;
};

type UpdateAppSettingsInput = Partial<CreateAppSettingsInput>;

const AppSettingsEntity = {
  getSingleton: async () => {
    let row = await prisma.appSettings.findFirst({
      select: {
        id: true,
        companyName: true,
        companyLogo: true,
        softwareName: true,
        primaryColor: true,
      },
    });
    if (!row) {
      const created = await prisma.appSettings.create({
        data: { companyName: "QC Item System" },
        select: {
          id: true,
          companyName: true,
          companyLogo: true,
          softwareName: true,
          primaryColor: true,
        },
      });
      return created;
    }
    return row;
  },

  update: async (data: UpdateAppSettingsInput) => {
    const existing = await prisma.appSettings.findFirst({
      select: { id: true },
    });
    if (!existing) {
      const created = await prisma.appSettings.create({
        data: {
          companyName: data.companyName ?? "QC Item System",
          companyLogo: data.companyLogo ?? null,
          softwareName: data.softwareName ?? null,
          primaryColor: data.primaryColor ?? null,
        },
        select: {
          id: true,
          companyName: true,
          companyLogo: true,
          softwareName: true,
          primaryColor: true,
        },
      });
      return created;
    }
    const updateResult = await prisma.appSettings.update({
      where: { id: existing.id },
      data: {
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.companyLogo !== undefined && { companyLogo: data.companyLogo }),
        ...(data.softwareName !== undefined && { softwareName: data.softwareName }),
        ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
      },
      select: {
        id: true,
        companyName: true,
        companyLogo: true,
        softwareName: true,
        primaryColor: true,
      },
    });
    return updateResult;
  },
};

export default AppSettingsEntity;
