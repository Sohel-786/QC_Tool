"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
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
  Trash2,
  AlertTriangle,
  LayoutDashboard,
  Database,
  Truck,
  BarChart3,
  FileText,
  LayoutGrid
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Role } from "@/types";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  useAppSettings,
  useUpdateAppSettings,
  useUploadCompanyLogo,
  useUserPermissions,
  useUpdateUserPermissions,
  useCurrentUserPermissions,
} from "@/hooks/use-settings";
import { useUsers, useCreateUser, useUpdateUser } from "@/hooks/use-users";
import { useDivisions } from "@/hooks/use-divisions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, UserPermission } from "@/types";
import { Plus, Edit2, Search, Eye, EyeOff } from "lucide-react";
import { applyPrimaryColor } from "@/lib/theme";
import { useSoftwareProfileDraft } from "@/contexts/software-profile-draft-context";
import {
  AVATAR_OPTIONS,
  DEFAULT_AVATAR_PATH,
  AVATAR_PRESETS_PATH,
} from "@/lib/avatar-options";
import { cn } from "@/lib/utils";

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
    .refine((val) => !val || val.length === 0 || val.length >= 1, {
      message: "Password cannot be empty",
    })
    .optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.nativeEnum(Role),
  isActive: z.boolean().optional(),
  avatar: z.string().nullable().optional(),
  mobileNumber: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  const isMandatory = data.role === Role.QC_USER || data.role === Role.QC_MANAGER;
  const mobile = data.mobileNumber?.trim();

  // Mandatory check for User/Manager
  if (isMandatory && (!mobile || mobile.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Mobile number is mandatory for User and Manager",
      path: ["mobileNumber"],
    });
    return;
  }

  // Regex check for Indian Phone Number if provided
  if (mobile && mobile.length > 0) {
    const indianPhoneRegex = /^[6-9]\d{9}$/;
    if (!indianPhoneRegex.test(mobile)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid 10-digit Indian mobile number",
        path: ["mobileNumber"],
      });
    }
  }
});
type UserForm = z.infer<typeof userSchema>;

const permissionLabels: Partial<Record<keyof UserPermission, string>> = {
  viewDashboard: "View Dashboard",
  viewMaster: "View Master Data",
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
  accessSettings: "Access Settings",
  manageUsers: "Manage Users",
  viewCompanyMaster: "View Company Master",
  viewLocationMaster: "View Location Master",
  viewContractorMaster: "View Contractor Master",
  viewStatusMaster: "View Status Master",
  viewMachineMaster: "View Machine Master",
  viewItemMaster: "View Item Master",
  viewItemCategoryMaster: "View Category Master",
  viewDivisionMaster: "View Division Master",
  viewActiveIssuesReport: "View Active Issues Report",
  viewMissingItemsReport: "View Missing Items Report",
  viewItemHistoryLedgerReport: "View Item History Ledger",
};

const permissionKeys = Object.keys(
  permissionLabels,
) as (keyof typeof permissionLabels)[];

function permissionsFlagsEqual(
  a: UserPermission | null | undefined,
  b: UserPermission | null | undefined,
): boolean {
  if (a == null && b == null) return true;
  if (!a || !b) return false;

  for (const key of permissionKeys) {
    if ((a as any)[key] !== (b as any)[key]) return false;
  }
  if (a.navigationLayout !== b.navigationLayout) return false;

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
  // Access
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { data: userPermissionsData, isLoading: permissionsLoading } = useUserPermissions(selectedUserId || undefined);
  const updateUserPermissionsMutation = useUpdateUserPermissions();
  const [localPermissions, setLocalPermissions] = useState<UserPermission | null>(null);
  const [localAllowedDivisionIds, setLocalAllowedDivisionIds] = useState<number[]>([]);

  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const resetSystem = useMutation({
    mutationFn: async () => {
      const res = await api.post("/maintenance/reset-system");
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "System reset successfully");
      setIsResetDialogOpen(false);
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to reset system");
    },
  });

  // Users
  const { data: users } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");


  // Divisions for access mapping
  const { data: divisions = [] } = useDivisions();

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

  // Admin-only (or anyone with accessSettings permission)
  const {
    data: currentUserPermissions,
    isLoading: currentUserPermissionsLoading,
  } = useCurrentUserPermissions();

  useEffect(() => {
    if (
      !userLoading &&
      !currentUserPermissionsLoading &&
      currentUser &&
      currentUserPermissions
    ) {
      if (
        currentUser.role !== Role.QC_ADMIN &&
        !currentUserPermissions.accessSettings
      ) {
        router.push("/dashboard");
      }
    }
  }, [
    currentUser,
    currentUserPermissions,
    userLoading,
    currentUserPermissionsLoading,
    router,
  ]);

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
    if (userPermissionsData) {
      setLocalPermissions(JSON.parse(JSON.stringify(userPermissionsData.permissions)));
      setLocalAllowedDivisionIds([...userPermissionsData.allowedDivisionIds]);
    } else {
      setLocalPermissions(null);
      setLocalAllowedDivisionIds([]);
    }
  }, [userPermissionsData]);

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
    userPermissionsData != null &&
    localPermissions != null &&
    (!permissionsFlagsEqual(localPermissions, userPermissionsData.permissions) ||
      JSON.stringify([...localAllowedDivisionIds].sort()) !== JSON.stringify([...userPermissionsData.allowedDivisionIds].sort()));

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
  }, [savedCompanyName, savedSoftwareName, savedPrimaryColor, setDraft]);

  const revertPermissions = useCallback(() => {
    if (userPermissionsData) {
      setLocalPermissions(JSON.parse(JSON.stringify(userPermissionsData.permissions)));
      setLocalAllowedDivisionIds([...userPermissionsData.allowedDivisionIds]);
    }
  }, [userPermissionsData]);

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

  if (
    currentUser &&
    currentUser.role !== Role.QC_ADMIN &&
    (!currentUserPermissions || !currentUserPermissions.accessSettings)
  ) {
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
    key: keyof UserPermission,
    value: any,
  ) => {
    if (!localPermissions) return;
    setLocalPermissions((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const handleSavePermissions = () => {
    if (selectedUserId && localPermissions) {
      updateUserPermissionsMutation.mutate({
        userId: selectedUserId,
        permissions: localPermissions,
        allowedDivisionIds: localAllowedDivisionIds
      });
    }
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
        mobileNumber: user.mobileNumber || "",
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
        username: data.username,
        role: data.role,
        isActive: data.isActive,
        avatar: data.avatar ?? null,
        mobileNumber: data.mobileNumber,
      };
      if (data.password) updateData.password = data.password;
      updateUser.mutate(
        { id: editingUser.id, data: updateData },
        { onSuccess: handleCloseUserForm },
      );
    } else {
      if (!data.password) return;
      createUser.mutate(
        {
          username: data.username,
          password: data.password!,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          isActive: data.isActive ?? false,
          avatar: data.avatar ?? null,
          mobileNumber: data.mobileNumber,
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
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive
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

{/* {currentUser?.role === Role.QC_ADMIN && (
                  <Card className="border-red-200 shadow-sm overflow-hidden mt-6">
                    <CardHeader className="bg-red-50 border-b border-red-100">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="w-5 h-5" />
                        <CardTitle className="text-lg">Danger Zone</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-base font-semibold text-secondary-900">
                            System Reset
                          </h4>
                          <p className="text-sm text-secondary-600 mt-1 max-w-xl">
                            Permanently delete all master entries, transactional
                            data (issues/returns), and user accounts. Only your
                            admin account and core settings will be preserved.
                            <br />
                            <span className="font-semibold text-red-600">
                              This action cannot be undone.
                            </span>
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          className="gap-2 whitespace-nowrap"
                          onClick={() => setIsResetDialogOpen(true)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Reset System
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )} */}
              </motion.div>
            )}

{/* <Dialog
              isOpen={isResetDialogOpen}
              onClose={() => setIsResetDialogOpen(false)}
              title="Full System Reset?"
              size="sm"
            >
              <div className="space-y-4">
                <div className="bg-red-50 p-4 rounded-lg flex items-start gap-3 border border-red-100">
                  <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-bold mb-1">Warning: Critical Action</p>
                    <ul className="list-disc list-inside space-y-1 opacity-90">
                      <li>All Master Entries will be deleted</li>
                      <li>All Outward/Inward data will be wiped</li>
                      <li>All stored images will be removed</li>
                      <li>All users except the primary admin will be removed</li>
                    </ul>
                  </div>
                </div>
                <p className="text-secondary-600 text-sm italic">
                  Initial system defaults (Standard Statuses, Categories, etc.)
                  will be re-seeded for a fresh start.
                </p>
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsResetDialogOpen(false)}
                    className="flex-1"
                    disabled={resetSystem.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => resetSystem.mutate()}
                    className="flex-1"
                    disabled={resetSystem.isPending}
                  >
                    {resetSystem.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      "Yes, Reset Everything"
                    )}
                  </Button>
                </div>
              </div>
            </Dialog> */}

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
                      Manage user-specific permissions. Permissions are granular and override role defaults.
                    </p>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">

                    {/* User Selection */}
                    <div className="max-w-md">
                      <Label>Select User to Manage</Label>
                      <select
                        className="mt-1 w-full rounded-md border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        value={selectedUserId || ""}
                        onChange={(e) => setSelectedUserId(Number(e.target.value) || null)}
                      >
                        <option value="">-- Select a User --</option>
                        {users?.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.username}) - {u.role}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedUserId && permissionsLoading && (
                      <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                      </div>
                    )}

                    {selectedUserId && !permissionsLoading && localPermissions && (() => {
                      const managedUser = users?.find(u => u.id === selectedUserId);
                      const isManagedUserAdmin = managedUser?.role === Role.QC_ADMIN;

                      return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                            {/* Module: System & Navigation */}
                            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-secondary-200">
                              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-secondary-100 pb-3 pt-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 bg-primary-100/50 rounded-lg text-primary-600">
                                    <LayoutDashboard className="w-5 h-5" />
                                  </div>
                                  <CardTitle className="text-base font-semibold text-primary-900">
                                    System & Navigation
                                  </CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent className="p-0 divide-y divide-secondary-100">
                                <label className="flex items-center justify-between p-4 hover:bg-secondary-50/50 cursor-pointer transition-colors group">
                                  <div>
                                    <p className="text-sm font-medium text-primary-900 group-hover:text-primary-700 transition-colors">Dashboard Access</p>
                                    <p className="text-xs text-secondary-500 mt-0.5">View dashboard statistics.</p>
                                  </div>
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={localPermissions.viewDashboard}
                                      onChange={(e) => handlePermissionChange("viewDashboard", e.target.checked)}
                                      className="w-5 h-5 rounded border-secondary-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                    />
                                  </div>
                                </label>
                                <label className="flex items-center justify-between p-4 hover:bg-secondary-50/50 cursor-pointer transition-colors group">
                                  <div>
                                    <p className="text-sm font-medium text-primary-900 group-hover:text-primary-700 transition-colors">Access Settings</p>
                                    <p className="text-xs text-secondary-500 mt-0.5">Manage system configuration.</p>
                                  </div>
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={localPermissions.accessSettings}
                                      onChange={(e) => handlePermissionChange("accessSettings", e.target.checked)}
                                      disabled={
                                        localPermissions.accessSettings &&
                                        (currentUser?.id === selectedUserId ||
                                          users?.find((u) => u.id === selectedUserId)?.role === Role.QC_ADMIN)
                                      }
                                      className="w-5 h-5 rounded border-secondary-300 text-primary-600 focus:ring-primary-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                  </div>
                                </label>
                                <div className="p-4 hover:bg-secondary-50/50 transition-colors">
                                  <div className="mb-2">
                                    <p className="text-sm font-medium text-primary-900">Navigation Layout</p>
                                    <p className="text-xs text-secondary-500 mt-0.5">Preferred menu style.</p>
                                  </div>
                                  <select
                                    value={localPermissions.navigationLayout}
                                    onChange={(e) => handlePermissionChange("navigationLayout", e.target.value)}
                                    className="w-full text-sm rounded-md border-secondary-300 py-2 px-3 focus:ring-primary-500 focus:border-primary-500 bg-white"
                                  >
                                    <option value="VERTICAL">Vertical Sidebar</option>
                                    <option value="HORIZONTAL">Horizontal Header</option>
                                  </select>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Module: Master Data */}
                            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-secondary-200 border-t-4 border-t-orange-500 lg:col-span-2">
                              <CardHeader className="bg-gradient-to-r from-orange-50/30 to-white border-b border-secondary-100 pb-3 pt-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-orange-100/50 rounded-lg text-orange-600">
                                      <Database className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-base font-semibold text-primary-900">
                                      Master Data
                                    </CardTitle>
                                  </div>
                                  <label className="flex items-center gap-2 cursor-pointer bg-white border border-secondary-200 px-3 py-1.5 rounded-full hover:bg-secondary-50 transition-colors shadow-sm">
                                    <span className="text-xs font-medium text-secondary-700">Enable Module</span>
                                    <input
                                      type="checkbox"
                                      checked={localPermissions.viewMaster}
                                      onChange={(e) => handlePermissionChange("viewMaster", e.target.checked)}
                                      className="w-4 h-4 rounded-full border-secondary-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                    />
                                  </label>
                                </div>
                              </CardHeader>
                              <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                                  {Object.keys(permissionLabels).filter(k => k.startsWith('view') && k.endsWith('Master') && k !== 'viewMaster').map(key => (
                                    <label key={key} className="flex items-center gap-3 cursor-pointer group">
                                      <input
                                        type="checkbox"
                                        checked={(localPermissions as any)[key]}
                                        onChange={(e) => handlePermissionChange(key as any, e.target.checked)}
                                        className="w-4.5 h-4.5 rounded border-secondary-300 text-orange-600 focus:ring-orange-500 transition-colors"
                                      />
                                      <span className="text-sm text-secondary-700 group-hover:text-primary-900 transition-colors">{(permissionLabels as any)[key].replace('View ', '')}</span>
                                    </label>
                                  ))}
                                </div>

                                <div className="mt-6 pt-5 border-t border-secondary-100">
                                  <h5 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">Actions</h5>
                                  <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border border-secondary-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all">
                                      <input
                                        type="checkbox"
                                        checked={localPermissions.addMaster}
                                        onChange={(e) => handlePermissionChange("addMaster", e.target.checked)}
                                        className="w-4 h-4 rounded border-secondary-300 text-orange-600 focus:ring-orange-500"
                                      />
                                      <span className="text-sm font-medium text-secondary-700">Add Records</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border border-secondary-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all">
                                      <input
                                        type="checkbox"
                                        checked={localPermissions.editMaster}
                                        onChange={(e) => handlePermissionChange("editMaster", e.target.checked)}
                                        className="w-4 h-4 rounded border-secondary-300 text-orange-600 focus:ring-orange-500"
                                      />
                                      <span className="text-sm font-medium text-secondary-700">Edit Records</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border border-secondary-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all">
                                      <input
                                        type="checkbox"
                                        checked={localPermissions.importExportMaster}
                                        onChange={(e) => handlePermissionChange("importExportMaster", e.target.checked)}
                                        className="w-4 h-4 rounded border-secondary-300 text-orange-600 focus:ring-orange-500"
                                      />
                                      <span className="text-sm font-medium text-secondary-700">Import / Export</span>
                                    </label>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Module: Operations (Outward/Inward) */}
                            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-secondary-200 border-t-4 border-t-blue-500">
                              <CardHeader className="bg-gradient-to-r from-blue-50/30 to-white border-b border-secondary-100 pb-3 pt-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 bg-blue-100/50 rounded-lg text-blue-600">
                                    <Truck className="w-5 h-5" />
                                  </div>
                                  <CardTitle className="text-base font-semibold text-primary-900">
                                    Operations
                                  </CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent className="p-0 divide-y divide-secondary-100">
                                {/* Outward */}
                                <div className="p-4 hover:bg-secondary-50/50 transition-colors">
                                  <div className="flex items-center justify-between mb-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={localPermissions.viewOutward}
                                        onChange={(e) => handlePermissionChange("viewOutward", e.target.checked)}
                                        className="w-5 h-5 rounded border-secondary-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="font-semibold text-sm text-primary-900">Outward / Issues</span>
                                    </label>
                                  </div>
                                  <div className="flex gap-3 pl-8">
                                    <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded border border-secondary-200 hover:border-blue-300 transition-colors">
                                      <input
                                        type="checkbox"
                                        checked={localPermissions.addOutward}
                                        onChange={(e) => handlePermissionChange("addOutward", e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-secondary-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-xs font-medium text-secondary-700">Create</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded border border-secondary-200 hover:border-blue-300 transition-colors">
                                      <input
                                        type="checkbox"
                                        checked={localPermissions.editOutward}
                                        onChange={(e) => handlePermissionChange("editOutward", e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-secondary-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-xs font-medium text-secondary-700">Edit</span>
                                    </label>
                                  </div>
                                </div>

                                {/* Inward */}
                                <div className="p-4 hover:bg-secondary-50/50 transition-colors">
                                  <div className="flex items-center justify-between mb-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={localPermissions.viewInward}
                                        onChange={(e) => handlePermissionChange("viewInward", e.target.checked)}
                                        className="w-5 h-5 rounded border-secondary-300 text-green-600 focus:ring-green-500"
                                      />
                                      <span className="font-semibold text-sm text-primary-900">Inward / Returns</span>
                                    </label>
                                  </div>
                                  <div className="flex gap-3 pl-8">
                                    <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded border border-secondary-200 hover:border-green-300 transition-colors">
                                      <input
                                        type="checkbox"
                                        checked={localPermissions.addInward}
                                        onChange={(e) => handlePermissionChange("addInward", e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-secondary-300 text-green-600 focus:ring-green-500"
                                      />
                                      <span className="text-xs font-medium text-secondary-700">Create</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded border border-secondary-200 hover:border-green-300 transition-colors">
                                      <input
                                        type="checkbox"
                                        checked={localPermissions.editInward}
                                        onChange={(e) => handlePermissionChange("editInward", e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-secondary-300 text-green-600 focus:ring-green-500"
                                      />
                                      <span className="text-xs font-medium text-secondary-700">Edit</span>
                                    </label>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Module: Reports */}
                            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-secondary-200 border-t-4 border-t-purple-500 lg:col-span-2">
                              <CardHeader className="bg-gradient-to-r from-purple-50/30 to-white border-b border-secondary-100 pb-3 pt-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-purple-100/50 rounded-lg text-purple-600">
                                      <BarChart3 className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-base font-semibold text-primary-900">
                                      Reports & Analytics
                                    </CardTitle>
                                  </div>
                                  <label className="flex items-center gap-2 cursor-pointer bg-white border border-secondary-200 px-3 py-1.5 rounded-full hover:bg-secondary-50 transition-colors shadow-sm">
                                    <span className="text-xs font-medium text-secondary-700">Enable Module</span>
                                    <input
                                      type="checkbox"
                                      checked={localPermissions.viewReports}
                                      onChange={(e) => handlePermissionChange("viewReports", e.target.checked)}
                                      className="w-4 h-4 rounded-full border-secondary-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                    />
                                  </label>
                                </div>
                              </CardHeader>
                              <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {Object.keys(permissionLabels).filter(k => k.startsWith('view') && k.endsWith('Report')).map(key => (
                                    <label key={key} className="flex items-center justify-between p-3 border border-secondary-200 rounded-lg cursor-pointer hover:border-purple-300 hover:bg-purple-50/30 transition-all group">
                                      <span className="text-sm text-secondary-700 font-medium group-hover:text-primary-900 transition-colors">{(permissionLabels as any)[key].replace('View ', '')}</span>
                                      <input
                                        type="checkbox"
                                        checked={(localPermissions as any)[key]}
                                        onChange={(e) => handlePermissionChange(key as any, e.target.checked)}
                                        className="w-4 h-4 rounded border-secondary-300 text-purple-600 focus:ring-purple-500"
                                      />
                                    </label>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>

                            {/* Module: Division Access */}
                            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-secondary-200 border-t-4 border-t-emerald-500 lg:col-span-3">
                              <CardHeader className="bg-gradient-to-r from-emerald-50/30 to-white border-b border-secondary-100 pb-3 pt-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 bg-emerald-100/50 rounded-lg text-emerald-600">
                                    <LayoutGrid className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-base font-semibold text-primary-900">
                                      Division Access
                                    </CardTitle>
                                    <p className="text-xs text-secondary-500 mt-0.5">Select which divisions this user can access. Admin role still sees all active divisions.</p>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                  {divisions.map((division) => {
                                    const isChecked = isManagedUserAdmin || localAllowedDivisionIds.includes(division.id);
                                    return (
                                      <label
                                        key={division.id}
                                        className={cn(
                                          "flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all group",
                                          isChecked
                                            ? "border-emerald-200 bg-emerald-50/30 shadow-sm"
                                            : "border-secondary-200 hover:border-emerald-200 hover:bg-emerald-50/30"
                                        )}
                                      >
                                        <span className="text-sm font-medium text-secondary-700 group-hover:text-primary-900 transition-colors">
                                          {division.name}
                                        </span>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          disabled={isManagedUserAdmin}
                                          onChange={(e) => {
                                            if (isManagedUserAdmin) return;
                                            if (e.target.checked) {
                                              setLocalAllowedDivisionIds([...localAllowedDivisionIds, division.id]);
                                            } else {
                                              setLocalAllowedDivisionIds(localAllowedDivisionIds.filter(id => id !== division.id));
                                            }
                                          }}
                                          className="w-4 h-4 rounded border-secondary-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                                        />
                                      </label>
                                    );
                                  })}
                                  {divisions.length === 0 && (
                                    <div className="col-span-full py-8 text-center bg-secondary-50 rounded-xl border border-dashed border-secondary-200">
                                      <p className="text-secondary-500 text-sm">No divisions configured in Division Master.</p>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>

                          </div>

                          <div className="flex justify-end gap-2 pt-6 border-t border-secondary-100">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={revertPermissions}
                              disabled={!hasUnsavedPermissions || updateUserPermissionsMutation.isPending}
                              className="gap-2"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </Button>
                            <Button
                              onClick={handleSavePermissions}
                              disabled={updateUserPermissionsMutation.isPending || !hasUnsavedPermissions}
                              className="gap-2"
                            >
                              {updateUserPermissionsMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              Save Permissions
                            </Button>
                          </div>
                        </>
                      );
                    })()}

                    {(!selectedUserId) && (
                      <div className="text-center py-12 text-secondary-500 italic">
                        Select a user above to view and manage their permissions.
                      </div>
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
                              Mobile No.
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
                              <td className="py-3 px-4 text-sm text-secondary-600">
                                {u.mobileNumber || "—"}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${u.role === Role.QC_ADMIN
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
                                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium transition-colors ${u.isActive
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
              <Input
                {...register("lastName")}
                className="mt-1"
                placeholder="Enter last name"
              />
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
              placeholder="Enter username"
            />
            {errors.username && (
              <p className="text-sm text-red-600 mt-1">
                {errors.username.message}
              </p>
            )}
          </div>
          <div>
            <Label>Mobile Number {watch("role") !== Role.QC_ADMIN ? "*" : ""}</Label>
            <Input
              {...register("mobileNumber")}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                e.target.value = value;
                register("mobileNumber").onChange(e);
              }}
              className="mt-1"
              placeholder="Enter 10-digit mobile number"
            />
            {errors.mobileNumber && (
              <p className="text-sm text-red-600 mt-1">
                {errors.mobileNumber.message}
              </p>
            )}
          </div>
          <div>
            <Label>Password *</Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className="pr-10"
                placeholder={
                  editingUser ? "Leave empty to keep current" : "Enter password"
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

          {/* Avatar selection – preset SVGs from /avatar/, default from /assets/avatar.jpg */}
          <div className="space-y-2">
            <Label className="text-base font-semibold text-primary-900">
              Avatar
            </Label>
            <p className="text-sm text-primary-700/80">
              Choose an avatar for this user. It will appear in the header and
              user list.
            </p>
            <div className="flex flex-row flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setValue("avatar", null, { shouldValidate: true })
                }
                className={`relative w-[30px] h-[30px] rounded-full overflow-hidden flex-shrink-0 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${!watch("avatar")
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
                    onClick={() =>
                      setValue("avatar", filename, { shouldValidate: true })
                    }
                    className={`relative w-[30px] h-[30px] rounded-full overflow-hidden flex-shrink-0 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${isSelected
                      ? "scale-[1.05] ring-2 ring-primary-500 ring-offset-2 ring-offset-white shadow-sm"
                      : "border border-secondary-200 hover:border-primary-300"
                      }`}
                    title={filename}
                  >
                    <img
                      src={`${AVATAR_PRESETS_PATH}/${filename}`}
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
