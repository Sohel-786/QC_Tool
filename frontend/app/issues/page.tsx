"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Issue, Tool, Division, Role } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";

const issueSchema = z.object({
  categoryId: z.number().min(1, "Tool category is required"),
  toolId: z.number().min(1, "Tool is required"),
  divisionId: z.number().min(1, "Division is required"),
  issuedTo: z.string().optional(),
  remarks: z.string().optional(),
});

type IssueForm = z.infer<typeof issueSchema>;

interface ToolCategory {
  id: number;
  name: string;
}

export default function IssuesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");
  const [toolSearchTerm, setToolSearchTerm] = useState("");
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

  const { data: availableTools } = useQuery<Tool[]>({
    queryKey: ["available-tools"],
    queryFn: async () => {
      const response = await api.get("/tools/available");
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

  const { data: activeDivisions } = useQuery<Division[]>({
    queryKey: ["active-divisions"],
    queryFn: async () => {
      const response = await api.get("/divisions/active");
      return response.data?.data || [];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IssueForm>({
    resolver: zodResolver(issueSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: IssueForm) => {
      const response = await api.post("/issues", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["available-tools"] });
      handleCloseForm();
    },
  });

  const handleOpenForm = async () => {
    reset();
    setSelectedCategoryId("");
    setToolSearchTerm("");
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
    setToolSearchTerm("");
    setNextIssueCode("");
  };

  const onSubmit = (data: IssueForm) => {
    createMutation.mutate({
      ...data,
      toolId: Number(data.toolId),
      divisionId: Number(data.divisionId),
      categoryId: Number(data.categoryId),
    });
  };

  const toolsByCategory = useMemo(() => {
    if (!availableTools || !selectedCategoryId) return [];
    return availableTools.filter(
      (tool) => tool.categoryId && tool.categoryId === selectedCategoryId,
    );
  }, [availableTools, selectedCategoryId]);

  const filteredToolsForSelect = useMemo(() => {
    if (!toolsByCategory) return [];
    const term = toolSearchTerm.toLowerCase();
    if (!term) return toolsByCategory;
    return toolsByCategory.filter(
      (tool) =>
        tool.toolName.toLowerCase().includes(term) ||
        tool.toolCode.toLowerCase().includes(term),
    );
  }, [toolsByCategory, toolSearchTerm]);

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
              <h1 className="text-3xl font-bold text-text mb-2">Tool Issues</h1>
              <p className="text-secondary-600">
                {isManager ? "View tool issues" : "Issue tools to divisions"}
              </p>
            </div>
            {!isManager && (
              <Button onClick={handleOpenForm} className="shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Issue Tool
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
                            {issue.tool?.toolName}
                          </h3>
                          <div className="space-y-1">
                            <p className="text-sm text-secondary-600">
                              <span className="font-medium">Issue No:</span>{" "}
                              {issue.issueNo}
                            </p>
                            <p className="text-sm text-secondary-600">
                              <span className="font-medium">Division:</span>{" "}
                              {issue.division?.name}
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
                    No issues found. Issue your first tool above.
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
          title="Issue New Tool"
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="categoryId">Tool Category *</Label>
                <Select
                  id="categoryId"
                  {...register("categoryId", { valueAsNumber: true })}
                  className="mt-1"
                  value={selectedCategoryId}
                  onChange={(e) => {
                    const value = e.target.value;
                    const num = value ? Number(value) : "";
                    setSelectedCategoryId(num);
                    setToolSearchTerm("");
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
                <Label htmlFor="divisionId">Division *</Label>
                <Select
                  id="divisionId"
                  {...register("divisionId", { valueAsNumber: true })}
                  className="mt-1"
                >
                  <option value="">Select a division</option>
                  {activeDivisions &&
                    Array.isArray(activeDivisions) &&
                    activeDivisions.map((division) => (
                      <option key={division.id} value={division.id}>
                        {division.name}
                      </option>
                    ))}
                </Select>
                {errors.divisionId && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.divisionId.message}
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
                <Label htmlFor="toolId">Tool *</Label>
                {selectedCategoryId && (
                  <div className="text-xs text-secondary-500">
                    {filteredToolsForSelect.length} tool(s) in category
                  </div>
                )}
              </div>
              <Input
                placeholder="Search tools by name or code..."
                value={toolSearchTerm}
                onChange={(e) => setToolSearchTerm(e.target.value)}
                className="mb-2"
                disabled={!selectedCategoryId}
              />
              <Select
                id="toolId"
                {...register("toolId", { valueAsNumber: true })}
                className="mt-1"
                disabled={!selectedCategoryId}
              >
                <option value="">
                  {selectedCategoryId
                    ? "Select a tool"
                    : "Select category first"}
                </option>
                {filteredToolsForSelect.map((tool) => (
                  <option key={tool.id} value={tool.id}>
                    {tool.toolName} ({tool.toolCode})
                  </option>
                ))}
              </Select>
              {errors.toolId && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.toolId.message}
                </p>
              )}
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
                {createMutation.isPending ? "Issuing..." : "Issue Tool"}
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
