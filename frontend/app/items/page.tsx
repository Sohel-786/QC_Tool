"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Item, ItemStatus, ItemCategory } from "@/types";
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
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const itemSchema = z.object({
  itemCode: z.string().optional(),
  itemName: z.string().min(1, "Item name is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  categoryId: z.number().min(1, "Item category is required"),
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
  const [nextItemCode, setNextItemCode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

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
    formState: { errors },
    setValue,
  } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
  });

  useEffect(() => {
    if (!isFormOpen) return;
    const t = setTimeout(() => {
      document.getElementById("item-name-input")?.focus();
    }, 100);
    return () => clearTimeout(t);
  }, [isFormOpen]);

  const createMutation = useMutation({
    mutationFn: async (fd: FormData) => {
      const res = await api.post("/items", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      handleCloseForm();
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
      const res = await api.patch(`/items/${id}`, { isActive });
      return res.data;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
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

  const handleOpenForm = async (item?: Item) => {
    if (item) {
      setEditingItem(item);
      setValue("itemCode", item.itemCode);
      setValue("itemName", item.itemName);
      setValue("serialNumber", item.serialNumber ?? "");
      setValue("description", item.description ?? "");
      setValue("categoryId", item.categoryId ?? categories[0]?.id ?? 0);
      setValue("status", item.status);
      setValue("isActive", item.isActive);
      setNextItemCode("");
      setImagePreview(item.image ? `${API_BASE}/storage/${item.image}` : null);
    } else {
      setEditingItem(null);
      reset();
      setImagePreview(null);
      try {
        const res = await api.get("/items/next-code");
        const next = res.data?.data?.nextCode ?? "";
        setNextItemCode(next);
        setValue("itemCode", next);
      } catch {
        setNextItemCode("");
      }
    }
    setImageFile(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    setNextItemCode("");
    setImageFile(null);
    setImagePreview(null);
    setIsDragOver(false);
    setImageError(null);
    reset();
    createMutation.reset();
    updateMutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = (data: ItemForm) => {
    const fd = new FormData();
    const code = editingItem
      ? editingItem.itemCode
      : data.itemCode || nextItemCode;
    if (code) fd.append("itemCode", code);
    fd.append("itemName", (data.itemName ?? "").trim());
    fd.append("serialNumber", (data.serialNumber ?? "").trim());
    fd.append("categoryId", String(data.categoryId));
    if (data.description) fd.append("description", data.description.trim());
    if (data.status) fd.append("status", data.status);
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
    toggleActiveMutation.mutate({ id: inactiveTarget.id, isActive: false });
  };

  const handleMarkActive = (item: Item) => {
    toggleActiveMutation.mutate({ id: item.id, isActive: true });
  };

  const ACCEPTED_IMAGE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateImageFile = (f: File): string | null => {
    if (!ACCEPTED_IMAGE_TYPES.includes(f.type)) {
      return "Use JPG, PNG or WebP only.";
    }
    if (f.size > MAX_IMAGE_SIZE) {
      return "Image must be under 5MB.";
    }
    return null;
  };

  const applyImageFile = (f: File) => {
    const err = validateImageFile(f);
    if (err) {
      setImageError(err);
      toast.error(err);
      return;
    }
    setImageError(null);
    setImageFile(f);
    const r = new FileReader();
    r.onloadend = () => setImagePreview(r.result as string);
    r.readAsDataURL(f);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    applyImageFile(f);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    applyImageFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filteredItems = useMemo(() => {
    let list = items;
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.itemName.toLowerCase().includes(q) ||
          i.itemCode.toLowerCase().includes(q) ||
          (i.serialNumber?.toLowerCase().includes(q) ?? false),
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
            <Button onClick={() => handleOpenForm()} className="shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
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
                <div className="overflow-x-auto rounded-lg border border-secondary-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-secondary-200 bg-secondary-50">
                        <th className="px-2 py-3 font-semibold text-text w-12">
                          Image
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Code
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Name
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Serial
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Category
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Status
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Active
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
                          className="border-b border-secondary-100 hover:bg-secondary-50/50"
                        >
                          <td className="px-2 py-3">
                            <div className="w-[30px] h-[30px] rounded overflow-hidden border border-secondary-200 bg-secondary-50 shrink-0">
                              {i.image ? (
                                <img
                                  src={`${API_BASE}/storage/${i.image}`}
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
                          <td className="px-4 py-3 font-mono text-secondary-700">
                            {i.itemCode}
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
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                i.isActive
                                  ? "bg-green-100 text-green-700 border border-green-200"
                                  : "bg-red-100 text-red-700 border border-red-200"
                              }`}
                            >
                              {i.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenForm(i)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              {i.isActive ? (
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
                              )}
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
                ? `"${inactiveTarget.itemName}" (${inactiveTarget.itemCode}) will be marked inactive. You can reactivate it later.`
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
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0 -m-6"
            aria-label={editingItem ? "Update item" : "Add new item"}
          >
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-4">
              <div className="grid grid-cols-1 lg:grid-cols-[65%_1fr] gap-6 lg:gap-8">
                {/* Left column – form fields (~65%) */}
                <div className="space-y-5">
                  <div>
                    <Label
                      htmlFor="item-name-input"
                      className="text-sm font-medium text-secondary-700"
                    >
                      Item Master Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="item-name-input"
                      {...register("itemName")}
                      placeholder="e.g. Calibration device"
                      className="mt-1.5 h-10 border-secondary-300 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                      aria-required="true"
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
                        htmlFor="item-code"
                        className="text-sm font-medium text-secondary-700"
                      >
                        Item Master Code
                      </Label>
                      <Input
                        id="item-code"
                        disabled
                        readOnly
                        value={
                          editingItem ? editingItem.itemCode : nextItemCode
                        }
                        className="mt-1.5 h-10 bg-secondary-50 border-secondary-200 text-secondary-600"
                        aria-readonly="true"
                      />
                    </div>
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
                  </div>
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
                    <div className="flex flex-wrap gap-6 pt-2">
                      <div>
                        <Label
                          htmlFor="status"
                          className="text-sm font-medium text-secondary-700"
                        >
                          Status
                        </Label>
                        <select
                          id="status"
                          {...register("status")}
                          className="mt-1.5 flex h-10 w-full min-w-[140px] rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                        >
                          <option value={ItemStatus.AVAILABLE}>
                            Available
                          </option>
                          <option value={ItemStatus.ISSUED}>Issued</option>
                          <option value={ItemStatus.MISSING}>Missing</option>
                        </select>
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

                {/* Right column – image upload (~35%) */}
                <div className="lg:min-h-[320px]">
                  <div className="rounded-xl border border-secondary-200 bg-secondary-50/50 overflow-hidden h-full min-h-[260px] flex flex-col">
                    <div className="px-4 py-3 border-b border-secondary-200 bg-white">
                      <h3 className="text-sm font-semibold text-text">
                        Item Image
                      </h3>
                      <p className="text-xs text-secondary-500 mt-0.5">
                        JPG, PNG or WebP · Max 5MB
                      </p>
                    </div>
                    <div className="flex-1 p-4 flex flex-col">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageChange}
                        ref={fileInputRef}
                        className="hidden"
                        tabIndex={-1}
                        aria-hidden="true"
                      />
                      {imagePreview ? (
                        <div className="flex flex-col flex-1 min-h-0">
                          <div className="relative rounded-lg overflow-hidden border border-secondary-200 bg-white aspect-square max-h-[220px] flex-shrink-0">
                            <img
                              src={imagePreview}
                              alt="Item preview"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          {imageFile && (
                            <p
                              className="mt-2 text-xs text-secondary-600 truncate"
                              title={imageFile.name}
                            >
                              {imageFile.name} · {formatBytes(imageFile.size)}
                            </p>
                          )}
                          {!imageFile && editingItem?.image && (
                            <p className="mt-2 text-xs text-secondary-600">
                              Current image
                            </p>
                          )}
                          {imageError && (
                            <p
                              className="mt-1 text-xs text-red-600"
                              role="alert"
                            >
                              {imageError}
                            </p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              className="flex-1"
                            >
                              <RefreshCw className="w-4 h-4 mr-1.5" />
                              Replace
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleRemoveImage}
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                            >
                              <Trash2 className="w-4 h-4 mr-1.5" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => fileInputRef.current?.click()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              fileInputRef.current?.click();
                            }
                          }}
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          className={`flex-1 min-h-[200px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${isDragOver ? "border-primary-400 bg-primary-50/50" : "border-secondary-300 bg-white hover:border-primary-300 hover:bg-primary-50/30"}`}
                          aria-label="Upload image; drag and drop or click to select"
                        >
                          <Upload className="w-10 h-10 text-secondary-400" />
                          <span className="text-sm font-medium text-secondary-600">
                            Drag & drop or click to upload
                          </span>
                          <span className="text-xs text-secondary-500">
                            JPG, PNG, WebP · Max 5MB
                          </span>
                          {imageError && (
                            <p className="text-xs text-red-600" role="alert">
                              {imageError}
                            </p>
                          )}
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
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                aria-describedby="item-form-hint"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving…"
                  : editingItem
                    ? "Update Item Master"
                    : "Create Item Master"}
              </Button>
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
      </motion.div>
    </div>
  );
}
