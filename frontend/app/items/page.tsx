"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Item, ItemStatus, ItemCategory, Role } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  Edit2,
  Search,
  Ban,
  CheckCircle,
  Image as ImageIcon,
  X,
  Upload,
  Download,
  Trash2,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CameraPhotoInput, CameraPhotoInputRef } from "@/components/ui/camera-photo-input";
import { FullScreenImageViewer } from "@/components/ui/full-screen-image-viewer";
import { useMasterExportImport } from "@/hooks/use-master-export-import";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "react-hot-toast";
import { ImportPreviewModal } from "@/components/dialogs/import-preview-modal";

import { Autocomplete } from "@/components/ui/autocomplete";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const itemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  categoryId: z.number().min(1, "Item category is required"),
  inHouseLocation: z.string().optional(),
  description: z.string().optional(),
  status: z.nativeEnum(ItemStatus).optional(),
  isActive: z.boolean().optional(),
});

type ItemForm = z.infer<typeof itemSchema>;
type ActiveFilter = "all" | "active" | "inactive";

export default function ItemsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [inactiveTarget, setInactiveTarget] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageRemovedByUser, setImageRemovedByUser] = useState(false);
  const [fullScreenImageSrc, setFullScreenImageSrc] = useState<string | null>(null);
  const cameraInputRef = useRef<CameraPhotoInputRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === Role.QC_ADMIN;
  const { data: permissions } = useCurrentUserPermissions();
  const canAddMaster = permissions?.addMaster ?? false;
  const canEditMaster = permissions?.editMaster ?? false;
  const canImportExportMaster = permissions?.importExportMaster ?? false;
  const {
    handleExport,
    handleImport,
    exportLoading,
    importLoading,
    validationData,
    isPreviewOpen,
    confirmImport,
    closePreview,
  } = useMasterExportImport("items", ["items"]);

  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ["items"],
    queryFn: async () => {
      const res = await api.get("/items");
      return res.data?.data ?? [];
    },
  });

  const { data: categories = [] } = useQuery<ItemCategory[]>({
    queryKey: ["item-categories", "active"],
    queryFn: async () => {
      const res = await api.get("/item-categories/active");
      return res.data?.data ?? [];
    },
  });

  const categoryMap = useMemo(() => {
    const m: Record<number, string> = {};
    for (const c of categories) m[c.id] = c.name;
    return m;
  }, [categories]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
    setValue,
  } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
  });



  const watchedItemName = watch("itemName");
  const watchedSerialNumber = watch("serialNumber");
  const watchedInHouseLocation = watch("inHouseLocation");
  const watchedCategoryId = watch("categoryId");

  // Suggestion logic: Filter unique item names based on selected category
  const filteredItemNames = useMemo(() => {
    if (!watchedCategoryId) return [];

    // Get items from this category
    const categoryItems = items.filter(i => i.categoryId === watchedCategoryId);

    // Extract unique names
    const names = new Set(categoryItems.map(i => i.itemName));
    return Array.from(names).sort();
  }, [items, watchedCategoryId]);

  // Suggestion logic for In House Location
  const filteredInHouseLocations = useMemo(() => {
    const locations = new Set(items.map(i => i.inHouseLocation).filter(Boolean) as string[]);
    return Array.from(locations).sort();
  }, [items]);

  const hasRequiredFields =
    typeof watchedItemName === "string" &&
    watchedItemName.trim().length > 0 &&
    typeof watchedSerialNumber === "string" &&
    watchedSerialNumber.trim().length > 0 &&
    typeof watchedCategoryId === "number" &&
    !Number.isNaN(watchedCategoryId) &&
    watchedCategoryId >= 1;

  const hasRequiredImage = editingItem
    ? !imageRemovedByUser || !!imageFile
    : !!imageFile;


  const createMutation = useMutation({
    mutationFn: async (fd: FormData) => {
      const res = await api.post("/items", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["items-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["available-items"] });

      // Reset form fields
      reset();

      // Clear image state for the next potential entry
      setImageFile(null);
      setImagePreview(null);
      setImageRemovedByUser(false);
      setImageError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      toast.success("Item created successfully");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create item.";
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, fd }: { id: number; fd: FormData }) => {
      const res = await api.patch(`/items/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["items-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["available-items"] });
      handleCloseForm();
      toast.success("Item updated successfully");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update item.";
      toast.error(msg);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const fd = new FormData();
      fd.append("isActive", String(isActive));
      const res = await api.patch(`/items/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["items-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["available-items"] });
      setInactiveTarget(null);
      toast.success(isActive ? "Item marked active." : "Item marked inactive.");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update status.";
      toast.error(msg);
    },
  });

  const handleOpenForm = useCallback((item?: Item) => {
    if (item) {
      setEditingItem(item);
      setValue("itemName", item.itemName);
      setValue("serialNumber", item.serialNumber ?? "");
      setValue("inHouseLocation", item.inHouseLocation ?? "");
      setValue("description", item.description ?? "");
      setValue("categoryId", item.categoryId ?? categories[0]?.id ?? 0);
      setValue("status", item.status);
      setValue("isActive", item.isActive);
      setImagePreview(item.image ? (item.image.startsWith("/") ? `${API_BASE}${item.image}` : `${API_BASE}/storage/${item.image}`) : null);
      setImageRemovedByUser(false);
    } else {
      setEditingItem(null);
      reset();
      setImagePreview(null);
      setImageRemovedByUser(false);
    }
    setImageFile(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsFormOpen(true);
  }, [categories, reset, setValue]);

  const handleCloseForm = useCallback(() => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setIsFormOpen(false);
    setEditingItem(null);
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    setImageRemovedByUser(false);
    reset();
    createMutation.reset();
    updateMutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [imagePreview, reset, createMutation, updateMutation]);

  const handleImageCapture = useCallback((file: File | null) => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
    setImageError(null);
    if (!file) setImageRemovedByUser(true);
  }, [imagePreview]);

  const checkDuplicateSerial = (serial: string, excludeId?: number) => {
    return items.some(
      (i) =>
        (i.serialNumber || "").trim().toLowerCase() === serial.trim().toLowerCase() &&
        i.id !== excludeId
    );
  };

  const checkDuplicateName = (name: string, categoryId: number, excludeId?: number) => {
    return items.some(
      (i) =>
        i.itemName.trim().toLowerCase() === name.trim().toLowerCase() &&
        i.categoryId === categoryId &&
        i.id !== excludeId
    );
  };

  const onSubmit = (data: ItemForm) => {
    const hasImage =
      !!imageFile ||
      (!!editingItem?.image && !imageFile && !imageRemovedByUser);
    if (!editingItem && !imageFile) {
      toast.error("Item image is required. Please take a photo.");
      setImageError("Take a photo to continue.");
      return;
    }
    if (editingItem && !hasImage) {
      toast.error("Item image is required. Please take a photo.");
      setImageError("Take a photo to continue.");
      return;
    }

    const itemName = (data.itemName ?? "").trim();
    const serialNumber = (data.serialNumber ?? "").trim();

    if (checkDuplicateSerial(serialNumber, editingItem?.id)) {
      toast.error("Serial number already exists");
      return;
    }

    if (checkDuplicateName(itemName, data.categoryId, editingItem?.id)) {
      toast.error("Item name already exists in this category");
      return;
    }

    if (editingItem && data.isActive === false && editingItem.status === ItemStatus.ISSUED) {
      toast.error("Item is in outward. Please inward first, then inactivate.");
      return;
    }

    const fd = new FormData();
    fd.append("itemName", itemName);
    fd.append("serialNumber", serialNumber);
    fd.append("categoryId", String(data.categoryId));
    if (data.inHouseLocation) fd.append("inHouseLocation", data.inHouseLocation.trim());
    if (data.description) fd.append("description", data.description.trim());
    if (!editingItem && data.status) fd.append("status", data.status);
    if (data.isActive !== undefined)
      fd.append("isActive", String(data.isActive));
    if (imageFile) fd.append("image", imageFile);

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, fd });
    } else {
      createMutation.mutate(fd);
    }
  };

  const handleMarkInactiveConfirm = () => {
    if (!inactiveTarget) return;
    if (inactiveTarget.status === ItemStatus.ISSUED) {
      toast.error("Item is in outward. Please inward first, then inactivate.");
      setInactiveTarget(null);
      return;
    }
    toggleActiveMutation.mutate({ id: inactiveTarget.id, isActive: false });
  };

  const handleMarkActive = (item: Item) => {
    toggleActiveMutation.mutate({ id: item.id, isActive: true });
  };

  const filteredItems = useMemo(() => {
    let list = items;
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.itemName.toLowerCase().includes(q) ||
          (i.serialNumber?.toLowerCase().includes(q) ?? false) ||
          (i.inHouseLocation?.toLowerCase().includes(q) ?? false),
      );
    }
    if (activeFilter === "active") list = list.filter((i) => i.isActive);
    if (activeFilter === "inactive") list = list.filter((i) => !i.isActive);
    return list;
  }, [items, searchTerm, activeFilter]);

  const statusColor = (s: ItemStatus) => {
    switch (s) {
      case ItemStatus.AVAILABLE:
        return "bg-green-100 text-green-700 border-green-200";
      case ItemStatus.ISSUED:
        return "bg-blue-100 text-blue-700 border-blue-200";
      case ItemStatus.MISSING:
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-secondary-100 text-secondary-700 border-secondary-200";
    }
  };

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text mb-2">Item Master</h1>
              <p className="text-secondary-600">Manage item master entries</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={importFileRef}
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    handleImport(f);
                    e.target.value = "";
                  }
                }}
              />
              {canImportExportMaster && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    disabled={exportLoading}
                    className="shadow-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => importFileRef.current?.click()}
                    disabled={importLoading}
                    className="shadow-sm"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                </>
              )}
              {canAddMaster && (
                <Button onClick={() => handleOpenForm()} className="shadow-md">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              )}
            </div>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 w-5 h-5" />
                  <Input
                    placeholder="Search by master name, code or serial..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="active-filter"
                    className="text-sm whitespace-nowrap"
                  >
                    Status
                  </Label>
                  <select
                    id="active-filter"
                    value={activeFilter}
                    onChange={(e) =>
                      setActiveFilter(e.target.value as ActiveFilter)
                    }
                    className="flex h-10 w-full sm:w-40 rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>All Items ({filteredItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
                </div>
              ) : filteredItems.length > 0 ? (
                <div className="overflow-x-auto overflow-y-hidden rounded-lg border border-secondary-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-primary-200 bg-primary-100">
                        <th className="px-4 py-3 font-semibold text-text w-16">
                          Sr.No
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Name
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Serial Number
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Category
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          In-House Location
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Status
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Active
                        </th>
                        <th className="px-2 py-3 font-semibold text-text w-12">
                          Image
                        </th>
                        <th className="px-4 py-3 font-semibold text-text text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((i, idx) => (
                        <motion.tr
                          key={i.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="border-b border-secondary-100 hover:bg-primary-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-secondary-600">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 font-medium text-text">
                            {i.itemName}
                          </td>
                          <td className="px-4 py-3 text-secondary-600">
                            {i.serialNumber ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600">
                            {i.categoryId != null
                              ? (categoryMap[i.categoryId] ?? "—")
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600">
                            {i.inHouseLocation ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor(
                                i.status,
                              )}`}
                            >
                              {i.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${i.isActive
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : "bg-red-100 text-red-700 border border-red-200"
                                }`}
                            >
                              {i.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-2 py-3">
                            <div
                              className="w-[30px] h-[30px] rounded overflow-hidden border border-secondary-200 bg-secondary-50 shrink-0 cursor-pointer hover:ring-2 hover:ring-primary-500 transition-shadow"
                              role="button"
                              tabIndex={0}
                              onClick={() => i.image && setFullScreenImageSrc(i.image.startsWith("/") ? `${API_BASE}${i.image}` : `${API_BASE}/storage/${i.image}`)}
                              onKeyDown={(e) => i.image && e.key === "Enter" && setFullScreenImageSrc(i.image.startsWith("/") ? `${API_BASE}${i.image}` : `${API_BASE}/storage/${i.image}`)}
                              title={i.image ? "View full screen" : undefined}
                            >
                              {i.image ? (
                                <img
                                  src={i.image.startsWith("/") ? `${API_BASE}${i.image}` : `${API_BASE}/storage/${i.image}`}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  width={30}
                                  height={30}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4 text-secondary-400" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenForm(i)}
                                title={canEditMaster ? "Edit item" : "View item (edit disabled)"}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              {isAdmin &&
                                (i.isActive ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setInactiveTarget(i)}
                                    className="text-amber-600 hover:bg-amber-50"
                                    disabled={toggleActiveMutation.isPending}
                                  >
                                    <Ban className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMarkActive(i)}
                                    className="text-green-600 hover:bg-green-50"
                                    disabled={toggleActiveMutation.isPending}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                ))}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-secondary-500 text-lg">
                    {searchTerm || activeFilter !== "all"
                      ? "No items match your filters."
                      : "No items yet. Add your first item above."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog
          isOpen={!!inactiveTarget}
          onClose={() => setInactiveTarget(null)}
          title="Mark item inactive?"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-secondary-600">
              {inactiveTarget
                ? `"${inactiveTarget.itemName}" will be marked inactive. You can reactivate it later.`
                : ""}
            </p>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInactiveTarget(null)}
                className="flex-1"
                disabled={toggleActiveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 bg-amber-600 hover:bg-amber-700"
                onClick={handleMarkInactiveConfirm}
                disabled={toggleActiveMutation.isPending}
              >
                {toggleActiveMutation.isPending ? "Updating…" : "Mark inactive"}
              </Button>
            </div>
          </div>
        </Dialog>

        <Dialog
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title={editingItem ? "Update Item Master" : "Add New Item Master"}
          size="2xl"
          contentScroll={false}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(onSubmit)(e);
            }}
            className="flex flex-col flex-1 min-h-0"
            aria-label={editingItem ? "Update item" : "Add new item"}
          >
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-4">
              <div className="grid grid-cols-1 lg:grid-cols-[65%_1fr] gap-6 lg:gap-8">
                {/* Left column – form fields (~65%) */}
                <div className="space-y-5">
                  <div>
                    <Label
                      htmlFor="categoryId"
                      className="text-sm font-medium text-secondary-700"
                    >
                      Item Category Master{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="categoryId"
                      {...register("categoryId", { valueAsNumber: true })}
                      onChange={(e) => {
                        const val = e.target.value;
                        setValue("categoryId", val ? Number(val) : 0, { shouldValidate: true });
                        if (val) {
                          setTimeout(() => {
                            document.getElementById("item-name-input")?.focus();
                          }, 100);
                        }
                      }}
                      className="mt-1.5 flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                      aria-required="true"
                      aria-invalid={!!errors.categoryId}
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {errors.categoryId && (
                      <p className="text-sm text-red-600 mt-1" role="alert">
                        {errors.categoryId.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label
                      htmlFor="item-name-input"
                      className="text-sm font-medium text-secondary-700"
                    >
                      Item Master Name <span className="text-red-500">*</span>
                    </Label>
                    <Autocomplete
                      id="item-name-input"
                      value={watchedItemName || ""}
                      onChange={(val) => setValue("itemName", val, { shouldValidate: true })}
                      options={filteredItemNames}
                      placeholder="e.g. Calibration device"
                      className="mt-1.5"
                      aria-invalid={!!errors.itemName}
                      aria-describedby={
                        errors.itemName ? "item-name-error" : "item-form-hint"
                      }
                    />
                    {errors.itemName && (
                      <p
                        id="item-name-error"
                        className="text-sm text-red-600 mt-1"
                        role="alert"
                      >
                        {errors.itemName.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="serialNumber"
                        className="text-sm font-medium text-secondary-700"
                      >
                        Serial Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="serialNumber"
                        {...register("serialNumber")}
                        placeholder="e.g. SN-12345"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            document.getElementById("inHouseLocation")?.focus();
                          }
                        }}
                        className="mt-1.5 h-10 border-secondary-300 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                        aria-required="true"
                        aria-invalid={!!errors.serialNumber}
                      />
                      {errors.serialNumber && (
                        <p className="text-sm text-red-600 mt-1" role="alert">
                          {errors.serialNumber.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label
                        htmlFor="inHouseLocation"
                        className="text-sm font-medium text-secondary-700"
                      >
                        In House Location{" "}
                        <span className="text-secondary-400 font-normal">
                          (optional)
                        </span>
                      </Label>
                      <Autocomplete
                        id="inHouseLocation"
                        value={watchedInHouseLocation || ""}
                        onChange={(val) => setValue("inHouseLocation", val)}
                        options={filteredInHouseLocations}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            // Only prevent default if we're not selecting an option in the autocomplete
                            // But usually autocomplete Enter selects, so we might need to handle it carefully
                            // For simplicity, let's just focus description if they press Enter again or if not open
                            setTimeout(() => {
                              document.getElementById("description")?.focus();
                            }, 50);
                          }
                        }}
                        placeholder="e.g. Rack A-1"
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium text-secondary-700"
                    >
                      Description{" "}
                      <span className="text-secondary-400 font-normal">
                        (optional)
                      </span>
                    </Label>
                    <Textarea
                      id="description"
                      {...register("description")}
                      placeholder="Optional notes..."
                      rows={4}
                      className="mt-1.5 border-secondary-300 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 resize-y min-h-[100px]"
                    />
                  </div>

                  {editingItem && (
                    <div className="flex flex-wrap gap-6 pt-2 items-center">
                      <div>
                        <Label className="text-sm font-medium text-secondary-700 block mb-1.5">
                          Status
                        </Label>
                        <span
                          className={`inline-flex px-3 py-1.5 rounded-full text-sm font-medium border ${statusColor(
                            editingItem.status,
                          )}`}
                        >
                          {editingItem.status}
                        </span>
                      </div>
                      <div className="flex items-end">
                        <Label
                          htmlFor="isActive"
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            id="isActive"
                            {...register("isActive")}
                            className="rounded w-4 h-4 text-primary-600 focus:ring-2 focus:ring-primary-500 border-secondary-300"
                          />
                          <span className="text-sm font-medium text-secondary-700">
                            Active
                          </span>
                        </Label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right column – Image management */}
                <div className="lg:min-h-[320px]">
                  <div className="rounded-xl border border-secondary-200 bg-white overflow-hidden h-full min-h-[260px] flex flex-col shadow-sm">
                    <div className="flex-1 p-5 flex flex-col space-y-4">
                      {editingItem && (editingItem._count?.issues ?? 0) > 0 ? (
                        <div className="space-y-4">
                          <Label className="text-sm font-semibold text-secondary-900">Item Master Image</Label>
                          <div
                            className="relative group cursor-pointer aspect-square rounded-xl overflow-hidden border border-secondary-200 bg-secondary-50"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setFullScreenImageSrc(editingItem.image ? (editingItem.image.startsWith("/") ? `${API_BASE}${editingItem.image}` : `${API_BASE}/storage/${editingItem.image}`) : null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                setFullScreenImageSrc(editingItem.image ? (editingItem.image.startsWith("/") ? `${API_BASE}${editingItem.image}` : `${API_BASE}/storage/${editingItem.image}`) : null);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            <img
                              src={editingItem.image ? (editingItem.image.startsWith("/") ? `${API_BASE}${editingItem.image}` : `${API_BASE}/storage/${editingItem.image}`) : ""}
                              alt={editingItem.itemName}
                              className="w-full h-full object-contain bg-white group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all shadow-lg"
                              >
                                View Full Screen
                              </Button>
                            </div>
                          </div>
                          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                            <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                            <p className="text-xs text-amber-700 leading-relaxed font-medium">
                              This item has transaction history. To maintain audit records, the <strong>initial master image</strong> is locked and cannot be changed.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col h-full">
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-sm font-semibold text-secondary-900">Item Master Image <span className="text-red-500">*</span></Label>
                            {(imagePreview || (editingItem?.image && !imageRemovedByUser)) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleImageCapture(null)}
                                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                              </Button>
                            )}
                          </div>

                          <div className="flex-1 flex flex-col min-h-[220px]">
                            {imagePreview || (editingItem?.image && !imageRemovedByUser) ? (
                              <div
                                className="flex-1 relative rounded-xl overflow-hidden border border-secondary-200 bg-secondary-50 cursor-pointer group"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setFullScreenImageSrc(imagePreview || (editingItem?.image ? (editingItem.image.startsWith("/") ? `${API_BASE}${editingItem.image}` : `${API_BASE}/storage/${editingItem.image}`) : null));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setFullScreenImageSrc(imagePreview || (editingItem?.image ? (editingItem.image.startsWith("/") ? `${API_BASE}${editingItem.image}` : `${API_BASE}/storage/${editingItem.image}`) : null));
                                  }
                                }}
                                role="button"
                                tabIndex={0}
                              >
                                <img
                                  src={imagePreview || (editingItem!.image!.startsWith("/") ? `${API_BASE}${editingItem!.image}` : `${API_BASE}/storage/${editingItem!.image}`)}
                                  alt="Preview"
                                  className="w-full h-full object-contain bg-white"
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/5">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="shadow-md"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setFullScreenImageSrc(imagePreview || (editingItem?.image ? (editingItem.image.startsWith("/") ? `${API_BASE}${editingItem.image}` : `${API_BASE}/storage/${editingItem.image}`) : null));
                                    }}
                                  >
                                    View Full Screen
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 flex flex-col gap-3">
                                <div
                                  className={cn(
                                    "flex-1 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center p-4 text-center group",
                                    "border-secondary-300 bg-secondary-50/50 hover:border-primary-400 hover:bg-primary-50/30",
                                    "hover:shadow-inner cursor-pointer"
                                  )}
                                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary-500', 'bg-primary-50'); }}
                                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary-500', 'bg-primary-50'); }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('border-primary-500', 'bg-primary-50');
                                    const file = e.dataTransfer.files?.[0];
                                    if (file && file.type.startsWith('image/')) {
                                      handleImageCapture(file);
                                    } else if (file) {
                                      toast.error("Please drop an image file (jpg, png, webp)");
                                    }
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file) handleImageCapture(file);
                                    };
                                    input.click();
                                  }}
                                >
                                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Upload className="w-6 h-6 text-primary-600" />
                                  </div>
                                  <p className="text-sm font-bold text-secondary-900">Upload or Drag & Drop</p>
                                  <p className="text-[11px] text-secondary-500 mt-1 px-4">
                                    JPG, PNG or WEBP (Standard formats)
                                  </p>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="h-px flex-1 bg-secondary-200" />
                                  <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">Or</span>
                                  <div className="h-px flex-1 bg-secondary-200" />
                                </div>

                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-12 border-secondary-300 hover:border-primary-400 hover:bg-primary-50 text-secondary-700 hover:text-primary-700 font-bold shadow-sm"
                                  onClick={() => {
                                    cameraInputRef.current?.open();
                                  }}
                                >
                                  <Camera className="w-5 h-5 mr-2" />
                                  Capture from Camera
                                </Button>

                                <div className="hidden">
                                  <CameraPhotoInput
                                    ref={cameraInputRef}
                                    onCapture={handleImageCapture}
                                    previewUrl={null}
                                    hideDefaultTrigger={true}
                                  />
                                </div>
                              </div>
                            )}

                            {imageError && (
                              <p className="mt-2 text-xs text-red-600 flex items-center gap-1.5 font-medium" role="alert">
                                <span className="w-1 h-1 rounded-full bg-red-600" />
                                {imageError}
                              </p>
                            )}
                          </div>

                          <div className="mt-4 pt-4 border-t border-secondary-100">
                            <p className="text-[11px] text-secondary-500 leading-relaxed italic">
                              Tip: Ensure the item is clearly visible in the photo for accurate quality check records.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p id="item-form-hint" className="sr-only" aria-live="polite">
              Press Enter to save.
            </p>

            {/* Sticky footer */}
            <div className="flex-none flex gap-3 px-6 py-4 border-t border-secondary-200 bg-secondary-50/50">
              {(editingItem ? canEditMaster : canAddMaster) && (
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending ||
                    updateMutation.isPending ||
                    !hasRequiredFields ||
                    !hasRequiredImage
                  }
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                  aria-describedby="item-form-hint"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving…"
                    : editingItem
                      ? "Update Item Master"
                      : "Create Item Master"}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseForm}
                className="flex-1 border-secondary-300"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Dialog>

        <ImportPreviewModal
          isOpen={isPreviewOpen}
          onClose={closePreview}
          data={validationData}
          onConfirm={confirmImport}
          isLoading={importLoading}
          title="Import Items Preview"
        />

        <FullScreenImageViewer
          isOpen={!!fullScreenImageSrc}
          onClose={() => setFullScreenImageSrc(null)}
          imageSrc={fullScreenImageSrc}
          alt="Item"
        />
      </motion.div>
    </div>
  );
}
