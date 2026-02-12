"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Contractor } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit2, Search, Ban, CheckCircle, Download, Upload } from "lucide-react";
import { useMasterExportImport } from "@/hooks/use-master-export-import";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { toast } from "react-hot-toast";
import { ImportPreviewModal } from "@/components/dialogs/import-preview-modal";

const contractorSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "Contractor name is required"),
  phoneNumber: z.string()
    .min(1, "Phone number is required")
    .regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number (10 digits starting with 6-9)"),
  isActive: z.boolean().optional(),
});

type ContractorForm = z.infer<typeof contractorSchema>;

type ActiveFilter = "all" | "active" | "inactive";

export default function ContractorsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(
    null,
  );
  const [inactiveTarget, setInactiveTarget] = useState<Contractor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const queryClient = useQueryClient();
  const importFileRef = useRef<HTMLInputElement>(null);
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
  } = useMasterExportImport("contractors", ["contractors"]);

  const { data: contractors = [], isLoading } = useQuery<Contractor[]>({
    queryKey: ["contractors"],
    queryFn: async () => {
      const res = await api.get("/contractors");
      return res.data?.data ?? [];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<ContractorForm>({
    resolver: zodResolver(contractorSchema),
  });


  const createMutation = useMutation({
    mutationFn: async (data: {
      code?: string;
      name: string;
      phoneNumber: string;
      isActive?: boolean;
    }) => {
      const res = await api.post("/contractors", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      reset();
      toast.success("Contractor created successfully");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create contractor.";
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ContractorForm }) => {
      const res = await api.patch(`/contractors/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      handleCloseForm();
      toast.success("Contractor updated successfully");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update contractor.";
      toast.error(msg);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await api.patch(`/contractors/${id}`, { isActive });
      return res.data;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      setInactiveTarget(null);
      toast.success(
        isActive ? "Contractor marked active." : "Contractor marked inactive.",
      );
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update status.";
      toast.error(msg);
    },
  });

  const handleOpenForm = (contractor?: Contractor) => {
    if (contractor) {
      setEditingContractor(contractor);
      setValue("name", contractor.name);
      setValue("phoneNumber", contractor.phoneNumber);
      setValue("isActive", contractor.isActive);
    } else {
      setEditingContractor(null);
      reset();
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingContractor(null);
    reset();
    createMutation.reset();
    updateMutation.reset();
  };

  const checkDuplicate = (name: string, excludeId?: number) => {
    return contractors.some(
      (c) =>
        c.name.trim().toLowerCase() === name.trim().toLowerCase() &&
        c.id !== excludeId
    );
  };

  const onSubmit = (data: ContractorForm) => {
    const name = (data.name ?? "").trim();
    if (!name) {
      toast.error("Contractor name is required");
      return;
    }

    if (checkDuplicate(name, editingContractor?.id)) {
      toast.error("Contractor name already exists");
      return;
    }

    if (editingContractor) {
      updateMutation.mutate({ id: editingContractor.id, data });
    } else {
      createMutation.mutate({
        name,
        phoneNumber: data.phoneNumber,
        isActive: data.isActive,
      });
    }
  };

  const handleMarkInactiveConfirm = () => {
    if (!inactiveTarget) return;
    toggleActiveMutation.mutate({ id: inactiveTarget.id, isActive: false });
  };

  const handleMarkActive = (c: Contractor) => {
    toggleActiveMutation.mutate({ id: c.id, isActive: true });
  };

  const filteredContractors = useMemo(() => {
    let list = contractors;
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (activeFilter === "active") list = list.filter((c) => c.isActive);
    if (activeFilter === "inactive") list = list.filter((c) => !c.isActive);
    return list;
  }, [contractors, searchTerm, activeFilter]);

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text mb-2">
                Contractor Master
              </h1>
              <p className="text-secondary-600">
                Manage contractor master entries
              </p>
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
                  Add Contractor
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
                    placeholder="Search by master name or code..."
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
              <CardTitle>
                All Contractors ({filteredContractors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
                </div>
              ) : filteredContractors.length > 0 ? (
                <div className="overflow-x-auto overflow-y-hidden rounded-lg border border-secondary-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-primary-200 bg-primary-100">
                        <th className="px-4 py-3 font-semibold text-primary-900 w-16">
                          Sr.No
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900">
                          Name
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900">
                          Phone Number
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900">
                          Status
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContractors.map((c, idx) => (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="border-b border-secondary-100 hover:bg-primary-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-secondary-600">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 font-medium text-text">
                            {c.name}
                          </td>
                          <td className="px-4 py-3 text-secondary-600">
                            {c.phoneNumber}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${c.isActive
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : "bg-red-100 text-red-700 border border-red-200"
                                }`}
                            >
                              {c.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenForm(c)}
                                title={canEditMaster ? "Edit contractor" : "View contractor (edit disabled)"}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              {canEditMaster &&
                                (c.isActive ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setInactiveTarget(c)}
                                    className="text-amber-600 hover:bg-amber-50"
                                    disabled={toggleActiveMutation.isPending}
                                  >
                                    <Ban className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMarkActive(c)}
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
                      ? "No contractors match your filters."
                      : "No contractors yet. Add your first contractor above."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog
          isOpen={!!inactiveTarget}
          onClose={() => setInactiveTarget(null)}
          title="Mark contractor inactive?"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-secondary-600">
              {inactiveTarget
                ? `"${inactiveTarget.name}" will be marked inactive. You can reactivate it later.`
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
          title={editingContractor ? "Update Contractor" : "Add New Contractor"}
          size="lg"
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            aria-label={
              editingContractor ? "Update contractor" : "Add new contractor"
            }
          >
            <div>
              <Label htmlFor="contractor-name-input">
                Contractor Master Name *
              </Label>
              <Input
                id="contractor-name-input"
                {...register("name")}
                placeholder="e.g. ABC Construction"
                className="mt-1"
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby={
                  errors.name
                    ? "contractor-name-error"
                    : "contractor-form-hint"
                }
              />
              {errors.name && (
                <p
                  id="contractor-name-error"
                  className="text-sm text-red-600 mt-1"
                  role="alert"
                >
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="contractor-phone-input">
                Phone Number *
              </Label>
              <Input
                id="contractor-phone-input"
                {...register("phoneNumber")}
                placeholder="10-digit mobile number"
                className="mt-1"
                aria-required="true"
                maxLength={10}
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '').slice(0, 10);
                }}
                aria-invalid={!!errors.phoneNumber}
              />
              {errors.phoneNumber && (
                <p className="text-sm text-red-600 mt-1" role="alert">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>
            {editingContractor && (
              <div>
                <Label
                  htmlFor="isActive"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    id="isActive"
                    {...register("isActive")}
                    className="rounded w-4 h-4 text-primary-600 focus:ring-primary-500 border-secondary-300"
                    aria-describedby="contractor-form-hint"
                  />
                  <span>Active</span>
                </Label>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {(editingContractor ? canEditMaster : canAddMaster) && (
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1"
                  aria-describedby="contractor-form-hint"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving…"
                    : editingContractor
                      ? "Update Contractor Master"
                      : "Create Contractor Master"}
                </Button>
              )}
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

        <ImportPreviewModal
          isOpen={isPreviewOpen}
          onClose={closePreview}
          data={validationData}
          onConfirm={confirmImport}
          isLoading={importLoading}
          title="Import Contractors Preview"
        />
      </motion.div>
    </div>
  );
}
