"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDestructiveDialog } from "@/components/ui/confirm-destructive-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Role } from "@/types";
import { toast } from "react-hot-toast";

const categorySchema = z.object({
  name: z
    .string()
    .min(2, "Category name must be at least 2 characters")
    .max(100, "Category name must be at most 100 characters"),
});

type CategoryForm = z.infer<typeof categorySchema>;

interface ToolCategory {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export default function ToolCategoriesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ToolCategory | null>(null);
  const [nextCategoryCode, setNextCategoryCode] = useState<string>("");
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();
  const isManager = currentUser?.role === Role.QC_MANAGER;

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
  } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: CategoryForm) => {
      const response = await api.post("/tool-categories", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool-categories"] });
      handleCloseForm();
      toast.success("Tool category created successfully");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        "Unable to create tool category. Please try again.";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/tool-categories/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tool-categories"] });
      setDeleteTarget(null);
      toast.success("Tool category deleted successfully");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        "Unable to delete tool category. It may be in use.";
      toast.error(message);
    },
  });

  const handleOpenForm = () => {
    reset();
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setNextCategoryCode("");
    reset();
  };

  const onSubmit = (data: CategoryForm) => {
    createMutation.mutate({
      name: data.name.trim(),
    });
  };

  const handleDeleteClick = (category: ToolCategory) => {
    setDeleteTarget(category);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

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
              <h1 className="text-3xl font-bold text-text mb-2">
                Tool Categories
              </h1>
              <p className="text-secondary-600">
                Define and manage categories for your QC tools
              </p>
            </div>
            {/* Both Manager and User can manage categories per requirements */}
            <Button onClick={handleOpenForm} className="shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>

          {/* Info card */}
          <Card className="shadow-sm border-amber-100 bg-amber-50/60">
            <CardContent className="py-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-1" />
              <div className="text-xs sm:text-sm text-amber-800">
                <p className="font-medium mb-1">Category rules</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Category names must be unique.</li>
                  <li>
                    Categories cannot be renamed once created (no edit, only
                    create and delete).
                  </li>
                  <li>
                    A category can be deleted only if it is not used in Tool
                    Master or Outward records.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Categories List */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>All Categories ({categories?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {categories && categories.length > 0 ? (
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 border border-secondary-200 rounded-lg bg-white"
                    >
                      <div>
                        <p className="font-medium text-text">{category.name}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(category)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-secondary-500 text-lg">
                    No categories found. Create your first category above.
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
          title="Delete tool category?"
          description={
            deleteTarget
              ? `Are you sure you want to delete the category "${deleteTarget.name}"? It will be blocked if used by any tool or outward record.`
              : ""
          }
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          isLoading={deleteMutation.isPending}
        />

        {/* Create Category Dialog */}
        <Dialog
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title="Add Tool Category"
          size="md"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {nextCategoryCode && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="categoryCode">Category Code</Label>
                  <Input
                    id="categoryCode"
                    value={nextCategoryCode}
                    disabled={true}
                    className="mt-1 bg-secondary-50"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="e.g. Calipers, Micrometers, Gauges"
                    className="mt-1"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
              </div>
            )}
            {!nextCategoryCode && (
              <div>
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="e.g. Calipers, Micrometers, Gauges"
                  className="mt-1"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
            )}
            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? "Saving..." : "Create Category"}
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
      </motion.div>
    </div>
  );
}
