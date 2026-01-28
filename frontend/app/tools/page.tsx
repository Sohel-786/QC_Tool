"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Tool, ToolStatus, Role } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDestructiveDialog } from "@/components/ui/confirm-destructive-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  Edit2,
  Search,
  Image as ImageIcon,
  X,
  Trash2,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "react-hot-toast";

const toolSchema = z.object({
  toolCode: z.string().optional(), // Auto-generated, optional in form
  toolName: z.string().min(1, "Tool name is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  categoryId: z.number().min(1, "Tool category is required"),
  description: z.string().optional(),
  status: z.nativeEnum(ToolStatus).optional(),
});

type ToolForm = z.infer<typeof toolSchema>;

interface ToolCategory {
  id: number;
  name: string;
}

export default function ToolsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tool | null>(null);
  const [nextToolCode, setNextToolCode] = useState<string>("");
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();
  const isManager = currentUser?.role === Role.QC_MANAGER;

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const { data: tools } = useQuery<Tool[]>({
    queryKey: ["tools"],
    queryFn: async () => {
      const response = await api.get("/tools");
      return response.data?.data || [];
    },
  });

  const { data: categories } = useQuery<ToolCategory[]>({
    queryKey: ["tool-categories"],
    queryFn: async () => {
      const response = await api.get("/tool-categories");
      return response.data?.data || [];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<ToolForm>({
    resolver: zodResolver(toolSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { formData: FormData }) => {
      const response = await api.post("/tools", data.formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      handleCloseForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { formData: FormData };
    }) => {
      const response = await api.patch(`/tools/${id}`, data.formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      handleCloseForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/tools/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      setDeleteTarget(null);
      toast.success("Tool deleted successfully");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        "Unable to delete tool. It may be in use by outward records.";
      toast.error(message);
    },
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await api.post("/tool-categories", data);
      return response.data;
    },
    onSuccess: (result: { data?: { id: number; name: string } }) => {
      const newCategory = result?.data;
      if (newCategory) {
        queryClient.invalidateQueries({ queryKey: ["tool-categories"] });
        setValue("categoryId", newCategory.id);
        setIsAddCategoryDialogOpen(false);
        setNewCategoryName("");
        toast.success("Tool category created");
      }
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        "Unable to create category. Please try again.";
      toast.error(message);
    },
  });

  const handleOpenForm = async (tool?: Tool) => {
    if (tool) {
      setEditingTool(tool);
      setValue("toolCode", tool.toolCode);
      setValue("toolName", tool.toolName);
      setValue("serialNumber", (tool as any).serialNumber || "");
      setValue("description", tool.description || "");
      setValue("status", tool.status);
      if ((tool as any).categoryId) {
        setValue("categoryId", (tool as any).categoryId);
      } else {
        // Force user to choose a category when editing legacy tools
        setValue("categoryId", 0 as any);
      }
      if (tool.image) {
        setImagePreview(`${API_BASE_URL}/storage/${tool.image}`);
      } else {
        setImagePreview(null);
      }
      setNextToolCode(""); // No next code when editing
    } else {
      setEditingTool(null);
      reset();
      setImagePreview(null);
      // Fetch next tool code for new tool
      try {
        const response = await api.get("/tools/next-code");
        const nextCode = response.data?.data?.nextCode || "";
        setNextToolCode(nextCode);
        setValue("toolCode", nextCode);
      } catch (error) {
        console.error("Failed to fetch next tool code:", error);
        setNextToolCode("");
      }
    }
    setImageFile(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTool(null);
    setImageFile(null);
    setImagePreview(null);
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
        alert(
          "Please select a valid image file (jpg, jpeg, png, gif, or webp)",
        );
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size must be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = (data: ToolForm) => {
    const formData = new FormData();
    // Use nextToolCode if creating new, or existing toolCode if editing
    const toolCodeToUse = editingTool
      ? editingTool.toolCode
      : data.toolCode || nextToolCode;
    if (toolCodeToUse) {
      formData.append("toolCode", toolCodeToUse);
    }
    formData.append("toolName", data.toolName);
    formData.append("serialNumber", data.serialNumber);
    formData.append("categoryId", String(data.categoryId));
    if (data.description) {
      formData.append("description", data.description);
    }
    if (data.status) {
      formData.append("status", data.status);
    }
    if (imageFile) {
      formData.append("image", imageFile);
    }

    if (editingTool) {
      updateMutation.mutate({ id: editingTool.id, data: { formData } });
    } else {
      createMutation.mutate({ formData });
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  const getStatusColor = (status: ToolStatus) => {
    switch (status) {
      case ToolStatus.AVAILABLE:
        return "bg-green-100 text-green-700 border-green-200";
      case ToolStatus.ISSUED:
        return "bg-blue-100 text-blue-700 border-blue-200";
      case ToolStatus.MISSING:
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-secondary-100 text-secondary-700 border-secondary-200";
    }
  };

  const filteredTools =
    tools?.filter(
      (tool) =>
        tool.toolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.toolCode.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text mb-2">QC Tools</h1>
              <p className="text-secondary-600">
                Manage your QC tools inventory
              </p>
            </div>
            <Button onClick={() => handleOpenForm()} className="shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Add Tool
            </Button>
          </div>

          {/* Search */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
                <Input
                  placeholder="Search tools by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tools List */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>All Tools ({filteredTools.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredTools.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTools.map((tool, index) => (
                    <motion.div
                      key={tool.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-5 border border-secondary-200 rounded-lg hover:shadow-lg transition-all bg-white group"
                    >
                      <div className="flex items-start gap-4 mb-3">
                        {tool.image ? (
                          <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-secondary-200 bg-secondary-50">
                            <img
                              src={`${API_BASE_URL}/storage/${tool.image}`}
                              alt={tool.toolName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-secondary-300 bg-secondary-50 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-secondary-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg text-text mb-1 truncate">
                                {tool.toolName}
                              </h3>
                              <p className="text-sm text-secondary-600 font-mono">
                                {tool.toolCode}
                              </p>
                            </div>
                            {!isManager && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenForm(tool)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteTarget(tool)}
                                  className="text-red-600 hover:bg-red-50"
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          {tool.description && (
                            <p className="text-sm text-secondary-500 mb-3 line-clamp-2">
                              {tool.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                tool.status,
                              )}`}
                            >
                              {tool.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-secondary-500 text-lg">
                    {searchTerm
                      ? "No tools found matching your search."
                      : "No tools found. Add your first tool above."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {/* Delete confirmation dialog */}
        <ConfirmDestructiveDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete tool?"
          description={
            deleteTarget
              ? `Are you sure you want to delete the tool "${deleteTarget.toolName}" (${deleteTarget.toolCode})? It will be blocked if used by any outward (issue) record.`
              : ""
          }
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          isLoading={deleteMutation.isPending}
        />
        {/* Form Dialog */}
        <Dialog
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title={editingTool ? "Update Tool" : "Add New Tool"}
          size="xl"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="toolCode">Tool Code</Label>
                <Input
                  id="toolCode"
                  {...register("toolCode")}
                  placeholder="TOOL-001"
                  disabled={true}
                  value={editingTool ? editingTool.toolCode : nextToolCode}
                  className="mt-1 bg-secondary-50"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="toolName">Tool Name *</Label>
                <Input
                  id="toolName"
                  {...register("toolName")}
                  placeholder="Calibration Tool"
                  className="mt-1"
                />
                {errors.toolName && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.toolName.message}
                  </p>
                )}
              </div>
              {editingTool && (
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select id="status" {...register("status")} className="mt-1">
                    <option value={ToolStatus.AVAILABLE}>Available</option>
                    <option value={ToolStatus.ISSUED}>Issued</option>
                    <option value={ToolStatus.MISSING}>Missing</option>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  {...register("description")}
                  placeholder="Optional description"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="serialNumber">Serial Number *</Label>
                <Input
                  id="serialNumber"
                  {...register("serialNumber")}
                  placeholder="Enter serial number"
                  className="mt-1"
                />
                {errors.serialNumber && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.serialNumber.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="categoryId">Tool Category *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs px-2"
                    onClick={() => {
                      setNewCategoryName("");
                      setIsAddCategoryDialogOpen(true);
                    }}
                  >
                    + Add Category
                  </Button>
                </div>
                <Select
                  id="categoryId"
                  {...register("categoryId", { valueAsNumber: true })}
                  className="mt-1"
                >
                  <option value="">Select a category</option>
                  {categories &&
                    categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </Select>
                {errors.categoryId && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.categoryId.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="image">Tool Image</Label>
              <div className="mt-1 space-y-2">
                {imagePreview ? (
                  <div className="relative">
                    <div className="w-full h-48 rounded-lg overflow-hidden border border-secondary-200 bg-secondary-50">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-full h-32 rounded-lg border-2 border-dashed border-secondary-300 bg-secondary-50 flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 text-secondary-400 mx-auto mb-2" />
                      <p className="text-sm text-secondary-500 mb-2">
                        No image selected
                      </p>
                    </div>
                  </div>
                )}
                <Input
                  id="image"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  ref={fileInputRef}
                  className="cursor-pointer"
                />
                <p className="text-xs text-secondary-500">
                  Supported formats: JPG, PNG, GIF, WebP (Max 5MB)
                </p>
              </div>
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingTool
                    ? "Update Tool"
                    : "Create Tool"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseForm}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Dialog>

        {/* Add Category nested dialog (on top of Add New Tool) */}
        <Dialog
          isOpen={isAddCategoryDialogOpen}
          onClose={() => {
            setIsAddCategoryDialogOpen(false);
            setNewCategoryName("");
          }}
          title="Add Tool Category"
          size="sm"
          overlayClassName="z-[110]"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = newCategoryName.trim();
              if (name.length < 2) {
                toast.error("Category name must be at least 2 characters");
                return;
              }
              addCategoryMutation.mutate({ name });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="newCategoryName">Category Name *</Label>
              <Input
                id="newCategoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Calipers, Micrometers"
                className="mt-1"
                disabled={addCategoryMutation.isPending}
              />
              <p className="text-xs text-secondary-500 mt-1">
                At least 2 characters
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddCategoryDialogOpen(false);
                  setNewCategoryName("");
                }}
                className="flex-1"
                disabled={addCategoryMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={
                  addCategoryMutation.isPending ||
                  newCategoryName.trim().length < 2
                }
              >
                {addCategoryMutation.isPending ? "Creating..." : "Create Category"}
              </Button>
            </div>
          </form>
        </Dialog>
      </motion.div>
    </div>
  );
}
