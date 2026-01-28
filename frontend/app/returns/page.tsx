"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Return, Issue, Role } from "@/types";
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
import { Plus } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";

const returnSchema = z.object({
  issueId: z.number().min(1, "Issue is required"),
  remarks: z.string().optional(),
});

type ReturnForm = z.infer<typeof returnSchema>;

export default function ReturnsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();
  const isManager = currentUser?.role === Role.QC_MANAGER;

  const { data: returns } = useQuery<Return[]>({
    queryKey: ["returns"],
    queryFn: async () => {
      const response = await api.get("/returns");
      return response.data?.data || [];
    },
  });

  const { data: activeIssues } = useQuery<Issue[]>({
    queryKey: ["active-issues"],
    queryFn: async () => {
      const response = await api.get("/issues/active");
      return response.data?.data || [];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReturnForm>({
    resolver: zodResolver(returnSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { formData: FormData }) => {
      const response = await api.post("/returns", data.formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["active-issues"] });
      handleCloseForm();
    },
  });

  const handleOpenForm = () => {
    reset();
    setImageFile(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    reset();
    setImageFile(null);
  };

  const onSubmit = (data: ReturnForm) => {
    if (!imageFile) {
      alert("Please select an image");
      return;
    }

    const formData = new FormData();
    formData.append("issueId", data.issueId.toString());
    formData.append("image", imageFile);
    if (data.remarks) {
      formData.append("remarks", data.remarks);
    }

    createMutation.mutate({ formData });
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
                Tool Returns
              </h1>
              <p className="text-secondary-600">
                {isManager ? "View tool returns" : "Return issued tools"}
              </p>
            </div>
            {!isManager && (
              <Button onClick={handleOpenForm} className="shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Return Tool
              </Button>
            )}
          </div>

          {/* Returns List */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>All Returns ({returns?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {returns && Array.isArray(returns) && returns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {returns.map((return_, index) => (
                    <motion.div
                      key={return_.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-5 border border-secondary-200 rounded-lg hover:shadow-lg transition-all bg-white"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-text mb-2">
                            {return_.issue?.tool?.toolName}
                          </h3>
                          <p className="text-sm text-secondary-600 mb-1">
                            <span className="font-medium">Issue No:</span>{" "}
                            {return_.issue?.issueNo}
                          </p>
                          {return_.remarks && (
                            <p className="text-sm text-secondary-500 mt-2 line-clamp-2">
                              {return_.remarks}
                            </p>
                          )}
                          <p className="text-xs text-secondary-500 mt-2">
                            {formatDateTime(return_.returnedAt)}
                          </p>
                        </div>
                      </div>
                      {return_.returnImage && (
                        <div className="mt-3">
                          <img
                            src={`http://localhost:3001/storage/${return_.returnImage}`}
                            alt="Return"
                            className="w-full h-32 object-cover rounded border border-secondary-200"
                          />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-secondary-500 text-lg">
                    No returns found. Return your first tool above.
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
          title="Return Tool"
          size="lg"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="issueId">Issue *</Label>
              <Select
                id="issueId"
                {...register("issueId", { valueAsNumber: true })}
                className="mt-1"
              >
                <option value="">Select an issue</option>
                {activeIssues &&
                  Array.isArray(activeIssues) &&
                  activeIssues.map((issue) => (
                    <option key={issue.id} value={issue.id}>
                      {issue.issueNo} - {issue.tool?.toolName} (
                      {issue.division?.name})
                    </option>
                  ))}
              </Select>
              {errors.issueId && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.issueId.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="image">Return Image *</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setImageFile(e.target.files[0]);
                  }
                }}
                className="mt-1"
              />
              {!imageFile && (
                <p className="text-sm text-red-600 mt-1">
                  Return image is required
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                {...register("remarks")}
                className="mt-1"
                rows={4}
              />
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? "Returning..." : "Return Tool"}
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
