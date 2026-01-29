"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Issue, Item, Role, ItemCategory } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";

const issueSchema = z.object({
  categoryId: z.number().min(1, "Item category is required"),
  itemId: z.number().min(1, "Item is required"),
  issuedTo: z.string().optional(),
  remarks: z.string().optional(),
});

type IssueForm = z.infer<typeof issueSchema>;

export default function IssuesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");
  const [nextIssueCode, setNextIssueCode] = useState<string>("");
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();
  const isManager = currentUser?.role === Role.QC_MANAGER;

  const { data: issues } = useQuery<Issue[]>({
    queryKey: ["issues"],
    queryFn: async () => {
      const response = await api.get("/issues");
      return response.data?.data || [];
    },
  });

  const { data: availableItems } = useQuery<Item[]>({
    queryKey: ["available-items"],
    queryFn: async () => {
      const response = await api.get("/items/available");
      return response.data?.data || [];
    },
  });

  const { data: categories } = useQuery<ItemCategory[]>({
    queryKey: ["item-categories", "active"],
    queryFn: async () => {
      const response = await api.get("/item-categories/active");
      return response.data?.data || [];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IssueForm>({
    resolver: zodResolver(issueSchema),
  });

  const selectedItemId = watch("itemId");

  const createMutation = useMutation({
    mutationFn: async (data: IssueForm) => {
      const response = await api.post("/issues", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["available-items"] });
      handleCloseForm();
    },
  });

  const handleOpenForm = async () => {
    reset();
    setSelectedCategoryId("");
    // Fetch next issue code
    try {
      const response = await api.get("/issues/next-code");
      const nextCode = response.data?.data?.nextCode || "";
      setNextIssueCode(nextCode);
    } catch (error) {
      console.error("Failed to fetch next issue code:", error);
      setNextIssueCode("");
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    reset();
    setSelectedCategoryId("");
    setNextIssueCode("");
  };

  const onSubmit = (data: IssueForm) => {
    createMutation.mutate({
      ...data,
      itemId: Number(data.itemId),
      categoryId: Number(data.categoryId),
    });
  };

  const itemsByCategory = useMemo(() => {
    if (!availableItems || !selectedCategoryId) return [];
    return availableItems.filter(
      (item) => item.categoryId && item.categoryId === selectedCategoryId,
    );
  }, [availableItems, selectedCategoryId]);

  const itemSelectOptions = useMemo(() => {
    if (!itemsByCategory) return [];
    return itemsByCategory.map((item) => ({
      value: item.id,
      label: `${item.itemName} (${item.itemCode})`,
    }));
  }, [itemsByCategory]);

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
              <h1 className="text-3xl font-bold text-text mb-2">Outward</h1>
              <p className="text-secondary-600">
                {isManager ? "View outward (issues)" : "Issue items outward"}
              </p>
            </div>
            {!isManager && (
              <Button onClick={handleOpenForm} className="shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Issue Item
              </Button>
            )}
          </div>

          {/* Issues List */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>All Issues ({issues?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {issues && Array.isArray(issues) && issues.length > 0 ? (
                <div className="space-y-4">
                  {issues.map((issue, index) => (
                    <motion.div
                      key={issue.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-5 border border-secondary-200 rounded-lg hover:shadow-lg transition-all bg-white"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-text mb-2">
                            {issue.item?.itemName}
                          </h3>
                          <div className="space-y-1">
                            <p className="text-sm text-secondary-600">
                              <span className="font-medium">Issue No:</span>{" "}
                              {issue.issueNo}
                            </p>
                            {issue.issuedTo && (
                              <p className="text-sm text-secondary-600">
                                <span className="font-medium">Issued To:</span>{" "}
                                {issue.issuedTo}
                              </p>
                            )}
                            {issue.remarks && (
                              <p className="text-sm text-secondary-500 mt-2">
                                {issue.remarks}
                              </p>
                            )}
                            <p className="text-xs text-secondary-500 mt-2">
                              {formatDateTime(issue.issuedAt)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-medium ${
                            issue.isReturned
                              ? "bg-green-100 text-green-700 border border-green-200"
                              : "bg-blue-100 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {issue.isReturned ? "Returned" : "Active"}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-secondary-500 text-lg">
                    No issues found. Issue your first item above.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Form Dialog */}
        <Dialog
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title="Issue New Item"
          size="xl"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {nextIssueCode && (
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="issueNo">Issue Number *</Label>
                  <Input
                    id="issueNo"
                    value={nextIssueCode}
                    disabled={true}
                    className="mt-1 bg-secondary-50"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="categoryId">Item Category *</Label>
                <Select
                  id="categoryId"
                  {...register("categoryId", { valueAsNumber: true })}
                  className="mt-1"
                  value={selectedCategoryId}
                  onChange={(e) => {
                    const value = e.target.value;
                    const num = value ? Number(value) : "";
                    setSelectedCategoryId(num);
                    setValue("itemId", 0 as any);
                  }}
                >
                  <option value="">Select a category</option>
                  {categories &&
                    Array.isArray(categories) &&
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
              <div>
                <Label htmlFor="issuedTo">Issued To (Optional)</Label>
                <Input
                  id="issuedTo"
                  {...register("issuedTo")}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="itemId">Item *</Label>
                {selectedCategoryId && (
                  <div className="text-xs text-secondary-500">
                    {itemSelectOptions.length} item(s) in category
                  </div>
                )}
              </div>
              <SearchableSelect
                id="itemId"
                label=""
                options={itemSelectOptions}
                value={selectedItemId ?? ""}
                onChange={(val) => setValue("itemId", Number(val))}
                placeholder={
                  selectedCategoryId ? "Select an item" : "Select category first"
                }
                disabled={!selectedCategoryId}
                searchPlaceholder="Search items by name or code..."
                error={errors.itemId?.message}
              />
            </div>
            <div>
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                {...register("remarks")}
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? "Issuing..." : "Issue Item"}
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
