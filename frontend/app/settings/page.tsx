"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Building2,
  Shield,
  Users,
  Upload,
  Save,
  Loader2,
  X,
} from "lucide-react";
import { Role } from "@/types";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  useAppSettings,
  useUpdateAppSettings,
  useUploadCompanyLogo,
  usePermissions,
  useUpdatePermissions,
} from "@/hooks/use-settings";
import { useUsers, useCreateUser, useUpdateUser } from "@/hooks/use-users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, RolePermission } from "@/types";
import { Plus, Edit2, Search, Eye, EyeOff } from "lucide-react";
import { applyPrimaryColor } from "@/lib/theme";
import { useSoftwareProfileDraft } from "@/contexts/software-profile-draft-context";
import { AVATAR_OPTIONS, DEFAULT_AVATAR_PATH } from "@/lib/avatar-options";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const tabs = [
  { id: "software", label: "Software", icon: Building2 },
  { id: "access", label: "Access", icon: Shield },
  { id: "users", label: "User Management", icon: Users },
] as const;

const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z
    .string()
    .refine((val) => !val || val.length === 0 || val.length >= 6, {
      message: "Password must be at least 6 characters",
    })
    .optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.nativeEnum(Role),
  isActive: z.boolean().optional(),
  avatar: z.string().nullable().optional(),
});
type UserForm = z.infer<typeof userSchema>;

const permissionLabels: Record<
  keyof Omit<RolePermission, "id" | "role" | "createdAt" | "updatedAt">,
  string
> = {
  viewDashboard: "View Dashboard",
  viewMaster: "View Master Entry",
  viewOutward: "View Outward",
  viewInward: "View Inward",
  viewReports: "View Reports",
  importExportMaster: "Import/Export Master",
  addOutward: "Add Outward",
  editOutward: "Edit Outward",
  addInward: "Add Inward",
  editInward: "Edit Inward",
  addMaster: "Add Master",
  editMaster: "Edit Master",
  manageUsers: "Manage Users",
  accessSettings: "Access Settings",
};

const permissionKeys = Object.keys(
  permissionLabels,
) as (keyof typeof permissionLabels)[];

function permissionsFlagsEqual(
  a: RolePermission[] | null | undefined,
  b: RolePermission[] | null | undefined,
): boolean {
  if (a == null && b == null) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const pa = a[i];
    const pb = b.find((p) => p.role === pa.role);
    if (!pb) return false;
    for (const key of permissionKeys) {
      if (pa[key] !== pb[key]) return false;
    }
  }
  return true;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user: currentUser, loading: userLoading } = useCurrentUser();
  const profileDraftContext = useSoftwareProfileDraft();
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]["id"]>("software");

  // Software (company profile) – all fields are draft until Save
  const { data: appSettings, isLoading: settingsLoading } = useAppSettings();
  const updateSettings = useUpdateAppSettings();
  const uploadLogo = useUploadCompanyLogo();
  const [companyName, setCompanyName] = useState("");
  const [softwareName, setSoftwareName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0d6efd");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  // Access
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();
  const updatePermissionsMutation = useUpdatePermissions();
  const [localPermissions, setLocalPermissions] = useState<RolePermission[]>(
    [],
  );

  // Users
  const { data: users } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const firstNameInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      role: Role.QC_USER,
      isActive: true,
      avatar: null as string | null,
    },
  });

  // Admin-only
  useEffect(() => {
    if (!userLoading && currentUser) {
      if (currentUser.role !== Role.QC_ADMIN) {
        router.push("/dashboard");
      }
    }
  }, [currentUser, userLoading, router]);

  const softwareSyncedFromServer = useRef(false);
  useEffect(() => {
    if (appSettings) {
      setCompanyName(appSettings.companyName || "");
      setSoftwareName(appSettings.softwareName || "");
      setPrimaryColor(appSettings.primaryColor || "#0d6efd");
      softwareSyncedFromServer.current = true;
    }
  }, [appSettings]);

  // Live draft in Sidebar/UI – set when on Settings page (depend on setDraft only, not whole context, to avoid loop when setDraft updates context)
  const setDraft = profileDraftContext?.setDraft;
  useEffect(() => {
    if (!setDraft) return;
    setDraft({
      companyName,
      softwareName,
      primaryColor,
      logoUrl:
        logoPreviewUrl ||
        (appSettings?.companyLogo
          ? `${API_BASE}/storage/${appSettings.companyLogo}`
          : null),
    });
  }, [
    setDraft,
    companyName,
    softwareName,
    primaryColor,
    logoPreviewUrl,
    appSettings?.companyLogo,
  ]);

  // Clear draft when leaving Settings page
  useEffect(() => {
    return () => {
      setDraft?.(null);
    };
  }, [setDraft]);

  // Live primary color – reflect in UI without saving
  useEffect(() => {
    applyPrimaryColor(primaryColor || undefined);
  }, [primaryColor]);

  useEffect(() => {
    if (permissions && permissions.length > 0) {
      setLocalPermissions(JSON.parse(JSON.stringify(permissions)));
    }
  }, [permissions]);

  const savedCompanyName = appSettings?.companyName ?? "";
  const savedSoftwareName = appSettings?.softwareName ?? "";
  const savedPrimaryColor = appSettings?.primaryColor ?? "#0d6efd";
  const hasUnsavedSoftware =
    softwareSyncedFromServer.current &&
    (companyName !== savedCompanyName ||
      softwareName !== savedSoftwareName ||
      primaryColor !== savedPrimaryColor ||
      logoFile !== null);
  const hasUnsavedPermissions =
    permissions != null &&
    permissions.length > 0 &&
    !permissionsFlagsEqual(localPermissions, permissions);

  const revertSoftware = useCallback(() => {
    setCompanyName(savedCompanyName);
    setSoftwareName(savedSoftwareName);
    setPrimaryColor(savedPrimaryColor);
    setLogoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setLogoFile(null);
    applyPrimaryColor(savedPrimaryColor || undefined);
    setDraft?.(null);
  }, [
    savedCompanyName,
    savedSoftwareName,
    savedPrimaryColor,
    setDraft,
  ]);

  const revertPermissions = useCallback(() => {
    if (permissions && permissions.length > 0) {
      setLocalPermissions(JSON.parse(JSON.stringify(permissions)));
    }
  }, [permissions]);

  const clearLogoDraft = useCallback(() => {
    setLogoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setLogoFile(null);
  }, []);

  useEffect(() => {
    if (!isUserFormOpen) {
      reset({
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        role: Role.QC_USER,
        isActive: true,
        avatar: null,
      });
    }
  }, [isUserFormOpen, reset]);

  // Focus First name when Add/Edit User form opens
  useEffect(() => {
    if (isUserFormOpen) {
      const t = setTimeout(() => firstNameInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isUserFormOpen]);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-secondary-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentUser && currentUser.role !== Role.QC_ADMIN) {
    return null;
  }

  const handleSaveSoftware = () => {
    if (logoFile) {
      uploadLogo.mutate(logoFile, {
        onSuccess: () => {
          updateSettings.mutate(
            {
              companyName: companyName || undefined,
              softwareName: softwareName || undefined,
              primaryColor: primaryColor || undefined,
            },
            {
              onSuccess: () => {
                applyPrimaryColor(primaryColor || undefined);
                clearLogoDraft();
                setDraft?.(null);
              },
            },
          );
        },
      });
    } else {
      updateSettings.mutate(
        {
          companyName: companyName || undefined,
          softwareName: softwareName || undefined,
          primaryColor: primaryColor || undefined,
        },
        {
          onSuccess: () => {
            applyPrimaryColor(primaryColor || undefined);
            setDraft?.(null);
          },
        },
      );
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      setLogoFile(file);
      setLogoPreviewUrl(URL.createObjectURL(file));
    }
    e.target.value = "";
  };

  const handlePermissionChange = (
    role: string,
    key: keyof RolePermission,
    value: boolean,
  ) => {
    setLocalPermissions((prev) =>
      prev.map((p) => (p.role === role ? { ...p, [key]: value } : p)),
    );
  };

  const handleSavePermissions = () => {
    updatePermissionsMutation.mutate(localPermissions);
  };

  const handleOpenUserForm = (user?: User) => {
    if (user) {
      setEditingUser(user);
      reset({
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar ?? null,
        password: "",
      });
    } else {
      setEditingUser(null);
      reset({
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        role: Role.QC_USER,
        isActive: true,
        avatar: null,
      });
    }
    setIsUserFormOpen(true);
  };

  const handleCloseUserForm = () => {
    setIsUserFormOpen(false);
    setEditingUser(null);
    setShowPassword(false);
  };

  const onSubmitUser = (data: UserForm) => {
    if (editingUser) {
      const updateData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        isActive: data.isActive,
        avatar: data.avatar ?? null,
      };
      if (data.password?.trim()) updateData.password = data.password;
      updateUser.mutate(
        { id: editingUser.id, data: updateData },
        { onSuccess: handleCloseUserForm },
      );
    } else {
      if (!data.password?.trim() || data.password.length < 6) return;
      createUser.mutate(
        {
          username: data.username,
          password: data.password!,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          isActive: data.isActive ?? true,
          avatar: data.avatar ?? null,
        },
        { onSuccess: handleCloseUserForm },
      );
    }
  };

  const filteredUsers =
    users?.filter(
      (u) =>
        u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  const displayLogoUrl =
    logoPreviewUrl ||
    (appSettings?.companyLogo
      ? `${API_BASE}/storage/${appSettings.companyLogo}`
      : null);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header with section tabs */}
        <div className="border-b border-secondary-200 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-xl shrink-0">
                <Settings className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-black">Settings</h1>
                <p className="text-secondary-600 mt-0.5">
                  Software profile, access control, and user management
                </p>
              </div>
            </div>
            <nav className="flex gap-1 p-1 bg-secondary-100 rounded-lg w-fit">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-white text-primary-600 shadow-sm"
                        : "text-secondary-700 hover:text-black"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <main className="min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === "software" && (
              <motion.div
                key="software"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader className="border-b border-secondary-100">
                    <CardTitle className="text-xl text-black">
                      Software Profile
                    </CardTitle>
                    <p className="text-sm text-secondary-600 font-normal mt-1">
                      Branding, software name, and primary color used across the
                      application
                    </p>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="flex flex-col sm:flex-row gap-8">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-28 h-28 rounded-xl border-2 border-dashed border-secondary-200 flex items-center justify-center overflow-hidden bg-secondary-50">
                          {displayLogoUrl ? (
                            <img
                              src={displayLogoUrl}
                              alt="Company logo"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Upload className="w-10 h-10 text-secondary-400" />
                          )}
                        </div>
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                            id="logo-upload"
                          />
                          <Label
                            htmlFor="logo-upload"
                            className="cursor-pointer px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors inline-block"
                          >
                            {logoFile
                              ? "Change logo (saved on Save changes)"
                              : "Choose Company Logo"}
                          </Label>
                          {logoFile && (
                            <p className="text-xs text-secondary-500 mt-1">
                              New image selected — click Save changes to apply
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <Label htmlFor="companyName" className="text-black">
                            Company Name
                          </Label>
                          <Input
                            id="companyName"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="e.g. Acme Corp"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="softwareName" className="text-black">
                            Software Name
                          </Label>
                          <Input
                            id="softwareName"
                            value={softwareName}
                            onChange={(e) => setSoftwareName(e.target.value)}
                            placeholder="e.g. QC Item System"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="primaryColor" className="text-black">
                            Primary Color
                          </Label>
                          <p className="text-xs text-secondary-500 mt-0.5 mb-1">
                            Drives all primary shades across the site. Text
                            remains black.
                          </p>
                          <div className="flex gap-2 mt-1">
                            <input
                              type="color"
                              id="primaryColor"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="w-12 h-10 rounded border border-secondary-200 cursor-pointer"
                            />
                            <Input
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="flex-1 font-mono text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={revertSoftware}
                        disabled={
                          !hasUnsavedSoftware || updateSettings.isPending
                        }
                        className="gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveSoftware}
                        disabled={
                          updateSettings.isPending ||
                          uploadLogo.isPending ||
                          !hasUnsavedSoftware
                        }
                        className="gap-2"
                      >
                        {updateSettings.isPending || uploadLogo.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === "access" && (
              <motion.div
                key="access"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader className="border-b border-secondary-100">
                    <CardTitle className="text-xl">
                      Access & Permissions
                    </CardTitle>
                    <p className="text-sm text-secondary-600 font-normal mt-1">
                      Control which roles can view sections and perform actions
                    </p>
                  </CardHeader>
                  <CardContent className="pt-6 overflow-x-auto">
                    {permissionsLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                      </div>
                    ) : (
                      <>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-primary-200 bg-primary-100">
                              <th className="text-left py-3 px-4 font-semibold text-primary-900">
                                Permission
                              </th>
                              <th className="text-center py-3 px-4 font-semibold text-primary-900">
                                User
                              </th>
                              <th className="text-center py-3 px-4 font-semibold text-primary-900">
                                Manager
                              </th>
                              <th className="text-center py-3 px-4 font-semibold text-primary-900">
                                Admin
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {permissionKeys.map((key) => (
                              <tr
                                key={key}
                                className="border-b border-secondary-100 hover:bg-secondary-50/50"
                              >
                                <td className="py-3 px-4 text-secondary-700">
                                  {permissionLabels[key]}
                                </td>
                                {["QC_USER", "QC_MANAGER", "QC_ADMIN"].map(
                                  (role) => {
                                    const perm = localPermissions.find(
                                      (p) => p.role === role,
                                    );
                                    const value = perm?.[key] ?? false;
                                    return (
                                      <td
                                        key={role}
                                        className="py-3 px-4 text-center"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={!!value}
                                          onChange={(e) =>
                                            handlePermissionChange(
                                              role,
                                              key,
                                              e.target.checked,
                                            )
                                          }
                                          className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                                        />
                                      </td>
                                    );
                                  },
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex justify-end gap-2 pt-6">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={revertPermissions}
                            disabled={
                              !hasUnsavedPermissions ||
                              updatePermissionsMutation.isPending
                            }
                            className="gap-2"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSavePermissions}
                            disabled={
                              updatePermissionsMutation.isPending ||
                              !hasUnsavedPermissions
                            }
                            className="gap-2"
                          >
                            {updatePermissionsMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            Save changes
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === "users" && (
              <motion.div
                key="users"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader className="border-b border-secondary-100 flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-xl">User Management</CardTitle>
                      <p className="text-sm text-secondary-600 font-normal mt-1">
                        Create, update, and activate or deactivate user accounts
                      </p>
                    </div>
                    <Button
                      onClick={() => handleOpenUserForm()}
                      className="gap-2 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      Add user
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                      <Input
                        placeholder="Search by name or username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="border border-secondary-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-primary-100 border-b border-primary-200">
                          <tr>
                            <th className="text-left py-3 px-4 font-semibold text-primary-900 text-sm">
                              Name
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-primary-900 text-sm">
                              Username
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-primary-900 text-sm">
                              Role
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-primary-900 text-sm">
                              Status
                            </th>
                            <th className="text-right py-3 px-4 font-semibold text-primary-900 text-sm">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((u) => (
                            <tr
                              key={u.id}
                              className="border-b border-secondary-100 hover:bg-secondary-50/50"
                            >
                              <td className="py-3 px-4">
                                {u.firstName} {u.lastName}
                                {currentUser && u.id === currentUser.id && (
                                  <span className="ml-2 text-xs text-blue-600">
                                    (You)
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono text-sm">
                                {u.username}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                    u.role === Role.QC_ADMIN
                                      ? "bg-amber-100 text-amber-800"
                                      : u.role === Role.QC_MANAGER
                                        ? "bg-purple-100 text-purple-700"
                                        : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {u.role === Role.QC_ADMIN
                                    ? "Admin"
                                    : u.role === Role.QC_MANAGER
                                      ? "Manager"
                                      : "User"}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {currentUser && u.id === currentUser.id ? (
                                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                    Active (You)
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateUser.mutate({
                                        id: u.id,
                                        data: { isActive: !u.isActive },
                                      })
                                    }
                                    disabled={updateUser.isPending}
                                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                                      u.isActive
                                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                                        : "bg-red-100 text-red-700 hover:bg-red-200"
                                    }`}
                                  >
                                    {u.isActive ? "Active" : "Inactive"} — click
                                    to toggle
                                  </button>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenUserForm(u)}
                                  className="hover:bg-primary-50"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredUsers.length === 0 && (
                        <div className="text-center py-12 text-secondary-500">
                          {searchTerm
                            ? "No users match your search."
                            : "No users yet. Add your first user."}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </motion.div>

      {/* User form dialog – full form, empty when adding */}
      <Dialog
        isOpen={isUserFormOpen}
        onClose={handleCloseUserForm}
        title={editingUser ? "Edit User" : "Add User"}
        size="lg"
      >
        <form
          key={editingUser ? `edit-${editingUser.id}` : "add"}
          onSubmit={handleSubmit(onSubmitUser)}
          className="space-y-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First name *</Label>
              <Input
                {...register("firstName")}
                ref={(el) => {
                  register("firstName").ref(el);
                  (firstNameInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                }}
                className="mt-1"
                placeholder="Enter first name"
              />
              {errors.firstName && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <Label>Last name *</Label>
              <Input {...register("lastName")} className="mt-1" placeholder="Enter last name" />
              {errors.lastName && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>
          <div>
            <Label>Username *</Label>
            <Input
              {...register("username")}
              className="mt-1"
              disabled={!!editingUser}
              placeholder="Enter username"
            />
            {errors.username && (
              <p className="text-sm text-red-600 mt-1">
                {errors.username.message}
              </p>
            )}
          </div>
          <div>
            <Label>
              Password {editingUser ? "(leave empty to keep)" : "*"}
            </Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className="pr-10"
                placeholder={
                  editingUser ? "Leave empty to keep current" : "Min 6 characters"
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-secondary-500 hover:text-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600 mt-1">
                {errors.password.message}
              </p>
            )}
          </div>
          <div>
            <Label>Role *</Label>
            <select
              {...register("role")}
              className="mt-1 w-full rounded-md border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value={Role.QC_USER}>User</option>
              <option value={Role.QC_MANAGER}>Manager</option>
              <option value={Role.QC_ADMIN}>Admin</option>
            </select>
          </div>

          {/* Avatar selection – below Role; row layout, 30px each, from /assets/avatar/ and default /assets/avatar.jpg */}
          <div className="space-y-2">
            <Label className="text-base font-semibold text-primary-900">Avatar</Label>
            <p className="text-sm text-primary-700/80">
              Choose an avatar for this user. It will appear in the header and user list.
            </p>
            <div className="flex flex-row flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setValue("avatar", null, { shouldValidate: true })}
                className={`relative w-[30px] h-[30px] rounded-full overflow-hidden flex-shrink-0 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  !watch("avatar")
                    ? "scale-[1.05] ring-2 ring-primary-500 ring-offset-2 ring-offset-white shadow-sm"
                    : "border border-secondary-200 hover:border-primary-300"
                }`}
                title="Default avatar"
              >
                <img
                  src={DEFAULT_AVATAR_PATH}
                  alt="Default"
                  className="w-full h-full object-cover"
                />
              </button>
              {AVATAR_OPTIONS.map((filename) => {
                const isSelected = watch("avatar") === filename;
                return (
                  <button
                    key={filename}
                    type="button"
                    onClick={() => setValue("avatar", filename, { shouldValidate: true })}
                    className={`relative w-[30px] h-[30px] rounded-full overflow-hidden flex-shrink-0 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      isSelected
                        ? "scale-[1.05] ring-2 ring-primary-500 ring-offset-2 ring-offset-white shadow-sm"
                        : "border border-secondary-200 hover:border-primary-300"
                    }`}
                    title={filename}
                  >
                    <img
                      src={`/assets/avatar/${filename}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              {...register("isActive")}
              className="rounded"
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={createUser.isPending || updateUser.isPending}
              className="flex-1"
            >
              {createUser.isPending || updateUser.isPending
                ? "Saving..."
                : editingUser
                  ? "Update"
                  : "Create"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseUserForm}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
