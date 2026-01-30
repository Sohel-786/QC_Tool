"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Return, Issue, Role, Status } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit2, Ban, CheckCircle } from "lucide-react";
import { CameraPhotoInput } from "@/components/ui/camera-photo-input";
import { FullScreenImageViewer } from "@/components/ui/full-screen-image-viewer";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatDateTime } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { toast } from "react-hot-toast";
import {
  TransactionFilters,
  defaultFilters,
  type TransactionFiltersState,
} from "@/components/filters/transaction-filters";
import { buildFilterParams, hasActiveFilters } from "@/lib/filters";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const returnSchema = z.object({
  issueId: z.number().min(1, "Issue is required"),
  statusId: z.number().min(1, "Status is required"),
  remarks: z.string().optional(),
});

type ReturnForm = z.infer<typeof returnSchema>;

export default function ReturnsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<Return | null>(null);
  const [inactiveTarget, setInactiveTarget] = useState<Return | null>(null);
  const [nextInwardCode, setNextInwardCode] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fullScreenImageSrc, setFullScreenImageSrc] = useState<string | null>(null);
  const [filters, setFilters] = useState<TransactionFiltersState>(defaultFilters);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const prefillIssueId = searchParams.get("issueId");
  const { user: currentUser } = useCurrentUser();
  const { data: permissions } = useCurrentUserPermissions();
  const canAddInward = permissions?.addInward ?? true;
  const canEditInward = permissions?.editInward ?? true;
  const isManager = currentUser?.role === Role.QC_MANAGER;

  const debouncedSearch = useDebouncedValue(filters.search, 400);
  const filtersForApi = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );
  const filterKey = useMemo(() => JSON.stringify(filtersForApi), [filtersForApi]);

  const { data: returns = [], isFetching: returnsLoading } = useQuery<Return[]>({
    queryKey: ["returns", filterKey],
    queryFn: async () => {
      const res = await api.get("/returns", { params: buildFilterParams(filtersForApi) });
      return res.data?.data ?? [];
    },
  });

  const { data: activeIssues = [] } = useQuery<Issue[]>({
    queryKey: ["active-issues"],
    queryFn: async () => {
      const res = await api.get("/issues/active");
      return res.data?.data ?? [];
    },
  });

  const { data: prefetchedIssue } = useQuery<Issue | null>({
    queryKey: ["issue", prefillIssueId],
    queryFn: async () => {
      if (!prefillIssueId) return null;
      const res = await api.get(`/issues/${prefillIssueId}`);
      return res.data?.data ?? null;
    },
    enabled: !!prefillIssueId && !!isFormOpen,
  });

  const { data: filterCompanies = [] } = useQuery({
    queryKey: ["companies", "active"],
    queryFn: async () => {
      const res = await api.get("/companies/active");
      return res.data?.data ?? [];
    },
  });
  const { data: filterContractors = [] } = useQuery({
    queryKey: ["contractors", "active"],
    queryFn: async () => {
      const res = await api.get("/contractors/active");
      return res.data?.data ?? [];
    },
  });
  const { data: filterMachines = [] } = useQuery({
    queryKey: ["machines", "active"],
    queryFn: async () => {
      const res = await api.get("/machines/active");
      return res.data?.data ?? [];
    },
  });
  const { data: filterItems = [] } = useQuery({
    queryKey: ["items", "active"],
    queryFn: async () => {
      const res = await api.get("/items/active");
      return res.data?.data ?? [];
    },
  });

  const { data: statuses = [] } = useQuery<Status[]>({
    queryKey: ["statuses", "active"],
    queryFn: async () => {
      const res = await api.get("/statuses/active");
      return res.data?.data ?? [];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReturnForm>({
    resolver: zodResolver(returnSchema),
  });

  const selectedIssueId = watch("issueId");
  const numIssueId = typeof selectedIssueId === "number" ? selectedIssueId : Number(selectedIssueId);
  const hasValidIssue = !Number.isNaN(numIssueId) && numIssueId > 0;
  const displayIssue = hasValidIssue
    ? (prefetchedIssue?.id === numIssueId ? prefetchedIssue : activeIssues.find((i) => i.id === numIssueId)) ?? null
    : null;

  const outwardOptions = useMemo(
    () =>
      activeIssues.map((issue) => ({
        value: issue.id,
        label: issue.issueNo,
      })),
    [activeIssues],
  );

  const filterOptions = useMemo(
    () => ({
      company: filterCompanies.map((c: { id: number; name: string }) => ({ value: c.id, label: c.name })),
      contractor: filterContractors.map((c: { id: number; name: string }) => ({ value: c.id, label: c.name })),
      machine: filterMachines.map((m: { id: number; name: string }) => ({ value: m.id, label: m.name })),
      item: filterItems.map((i: { id: number; itemName: string; serialNumber?: string | null }) => ({
        value: i.id,
        label: i.serialNumber ? `${i.itemName} (${i.serialNumber})` : i.itemName,
      })),
    }),
    [filterCompanies, filterContractors, filterMachines, filterItems],
  );

  const createMutation = useMutation({
    mutationFn: async (data: { formData: FormData }) => {
      const res = await api.post("/returns", data.formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["active-issues"] });
      handleCloseForm();
      toast.success("Inward entry created");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create inward entry.";
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { remarks?: string; statusId?: number };
    }) => {
      const res = await api.patch(`/returns/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      handleCloseEditForm();
      toast.success("Inward entry updated");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update inward entry.";
      toast.error(msg);
    },
  });

  const setInactiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.patch(`/returns/${id}/inactive`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      setInactiveTarget(null);
      toast.success("Inward marked inactive");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update.";
      toast.error(msg);
    },
  });

  const setActiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.patch(`/returns/${id}/active`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      toast.success("Inward marked active");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update.";
      toast.error(msg);
    },
  });

  const handleOpenForm = async (presetIssueId?: number) => {
    setEditingReturn(null);
    reset();
    setImageFile(null);
    setImagePreview(null);
    try {
      const res = await api.get("/returns/next-code");
      setNextInwardCode(res.data?.data?.nextCode ?? "");
    } catch {
      setNextInwardCode("");
    }
    if (presetIssueId) setValue("issueId", presetIssueId);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setIsFormOpen(false);
    setEditingReturn(null);
    reset();
    setNextInwardCode("");
    setImageFile(null);
    setImagePreview(null);
    createMutation.reset();
    if (typeof window !== "undefined" && prefillIssueId) {
      const u = new URL(window.location.href);
      u.searchParams.delete("issueId");
      window.history.replaceState({}, "", u.toString());
    }
  };

  const handleOpenEdit = (r: Return) => {
    setEditingReturn(r);
    setValue("issueId", r.issueId);
    setValue("statusId", r.statusId ?? 0);
    setValue("remarks", r.remarks ?? "");
    setIsFormOpen(true);
  };

  const handleCloseEditForm = () => {
    setIsFormOpen(false);
    setEditingReturn(null);
    reset();
    updateMutation.reset();
  };

  const handleMarkInactiveConfirm = () => {
    if (!inactiveTarget) return;
    setInactiveMutation.mutate(inactiveTarget.id);
  };

  const onEditSubmit = (data: ReturnForm) => {
    if (!editingReturn) return;
    updateMutation.mutate({
      id: editingReturn.id,
      data: {
        remarks: data.remarks,
        statusId: data.statusId,
      },
    });
  };

  const handleImageCapture = (file: File | null) => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  useEffect(() => {
    if (!prefillIssueId || isManager) return;
    const id = parseInt(prefillIssueId, 10);
    if (Number.isNaN(id)) return;
    (async () => {
      reset();
      setImageFile(null);
      setImagePreview(null);
      try {
        const res = await api.get("/returns/next-code");
        setNextInwardCode(res.data?.data?.nextCode ?? "");
      } catch {
        setNextInwardCode("");
      }
      setValue("issueId", id);
      setIsFormOpen(true);
    })();
  }, [prefillIssueId, isManager]);

  const onSubmit = (data: ReturnForm) => {
    if (!imageFile) {
      toast.error("Return image is required.");
      return;
    }
    const formData = new FormData();
    formData.append("issueId", String(data.issueId));
    formData.append("statusId", String(data.statusId));
    formData.append("image", imageFile);
    if (data.remarks) formData.append("remarks", data.remarks);
    createMutation.mutate({ formData });
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
              <h1 className="text-3xl font-bold text-text mb-2">Inward</h1>
              <p className="text-secondary-600">
                {isManager ? "View inward entries" : "Record returns (inward)"}
              </p>
            </div>
            {canAddInward && (
              <Button onClick={() => handleOpenForm()} className="shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Inward Entry
              </Button>
            )}
          </div>

          <TransactionFilters
            filters={filters}
            onFiltersChange={setFilters}
            companyOptions={filterOptions.company}
            contractorOptions={filterOptions.contractor}
            machineOptions={filterOptions.machine}
            itemOptions={filterOptions.item}
            onClear={() => setFilters(defaultFilters)}
            searchPlaceholder="Search by inward no., issue no., item, status…"
            className="shadow-sm"
          />

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Inward Entries ({returns.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {returnsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                </div>
              ) : returns.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-secondary-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-secondary-200 bg-secondary-50">
                        <th className="px-4 py-3 font-semibold text-text text-center">
                          Inward No
                        </th>
                        <th className="px-4 py-3 font-semibold text-text text-center">
                          Inward Date
                        </th>
                        <th className="px-4 py-3 font-semibold text-text text-center">
                          Issue No
                        </th>
                        <th className="px-4 py-3 font-semibold text-text text-center">
                          Item
                        </th>
                        <th className="px-4 py-3 font-semibold text-text text-center">
                          Company
                        </th>
                        <th className="px-4 py-3 font-semibold text-text text-center">
                          Contractor
                        </th>
                        <th className="px-4 py-3 font-semibold text-text text-center">
                          Machine
                        </th>
                        <th className="px-4 py-3 font-semibold text-text text-center">
                          Status
                        </th>
                        <th className="px-4 py-3 font-semibold text-text text-center">
                          Active
                        </th>
                        <th className="px-4 py-3 font-semibold text-text text-center w-[30px]">
                          Image
                        </th>
                        {(canAddInward || canEditInward) && (
                          <th className="px-4 py-3 font-semibold text-text text-center min-w-[160px]">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {returns.map((r, idx) => (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="border-b border-secondary-100 hover:bg-secondary-50/50"
                        >
                          <td className="px-4 py-3 font-mono text-secondary-700 text-center">
                            {r.returnCode ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600 text-center">
                            {formatDateTime(r.returnedAt)}
                          </td>
                          <td className="px-4 py-3 font-mono text-secondary-700 text-center">
                            {r.issue?.issueNo ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-medium text-text text-center">
                            {r.issue?.item?.itemName ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600 text-center">
                            {r.issue?.company?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600 text-center">
                            {r.issue?.contractor?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600 text-center">
                            {r.issue?.machine?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600 text-center">
                            {r.status?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                r.isActive
                                  ? "bg-green-100 text-green-700 border border-green-200"
                                  : "bg-red-100 text-red-700 border border-red-200"
                              }`}
                            >
                              {r.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center align-middle">
                            {r.returnImage ? (
                              <button
                                type="button"
                                onClick={() => setFullScreenImageSrc(`${API_BASE}/storage/${r.returnImage}`)}
                                className="w-[30px] h-[30px] rounded border border-secondary-200 inline-block overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-500 transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500"
                                title="View full screen"
                              >
                                <img
                                  src={`${API_BASE}/storage/${r.returnImage}`}
                                  alt="Inward"
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ) : (
                              <span className="text-secondary-400">—</span>
                            )}
                          </td>
                          {!isManager && (
                            <td className="px-4 py-3 min-w-[160px]">
                              <div className="flex flex-nowrap items-center justify-center gap-1 whitespace-nowrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEdit(r)}
                                  title="Edit inward"
                                  className="shrink-0"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                {/* Active/Inactive actions - commented out
                                {r.isActive && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setInactiveTarget(r)}
                                    title="Mark inward inactive"
                                    className="shrink-0 text-amber-600 hover:bg-amber-50"
                                    disabled={setInactiveMutation.isPending}
                                  >
                                    <Ban className="w-4 h-4" />
                                  </Button>
                                )}
                                {!r.isActive && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setActiveMutation.mutate(r.id)}
                                    title="Mark inward active"
                                    className="shrink-0 text-green-600 hover:bg-green-50"
                                    disabled={setActiveMutation.isPending}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                )}
                                */}
                              </div>
                            </td>
                          )}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-secondary-500 text-lg">
                    {hasActiveFilters(filters)
                      ? "No inward entries match your filters."
                      : "No inward entries yet. Create one above or from Outward."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog
            isOpen={!!inactiveTarget}
            onClose={() => setInactiveTarget(null)}
            title="Mark inward inactive?"
            size="sm"
          >
            <div className="space-y-4">
              <p className="text-secondary-600">
                {inactiveTarget
                  ? `"${inactiveTarget.returnCode ?? "Inward"}" — ${inactiveTarget.issue?.item?.itemName ?? "Item"} will be marked inactive. You can reactivate it later.`
                  : ""}
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInactiveTarget(null)}
                  className="flex-1"
                  disabled={setInactiveMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                  onClick={handleMarkInactiveConfirm}
                  disabled={setInactiveMutation.isPending}
                >
                  {setInactiveMutation.isPending ? "Updating…" : "Mark inactive"}
                </Button>
              </div>
            </div>
          </Dialog>
        </div>

        <Dialog
          isOpen={isFormOpen}
          onClose={editingReturn ? handleCloseEditForm : handleCloseForm}
          title={editingReturn ? "Edit Inward" : "Inward Entry"}
          size="2xl"
          contentScroll={false}
        >
          {editingReturn ? (
            <form
              onSubmit={handleSubmit(onEditSubmit)}
              className="flex flex-col flex-1 min-h-0 -m-6"
              aria-label="Edit inward form"
            >
              <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-4">
                <div className="grid grid-cols-1 lg:grid-cols-[65%_1fr] gap-6 lg:gap-8">
                  {/* Left column – form fields */}
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-secondary-700">
                          Inward No
                        </Label>
                        <Input
                          value={editingReturn.returnCode ?? "—"}
                          disabled
                          readOnly
                          className="mt-1.5 h-10 bg-secondary-50 border-secondary-200"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-secondary-700">
                          Issue No
                        </Label>
                        <Input
                          value={editingReturn.issue?.issueNo ?? "—"}
                          disabled
                          readOnly
                          className="mt-1.5 h-10 bg-secondary-50 border-secondary-200"
                        />
                      </div>
                    </div>
                    {editingReturn.issue && (
                      <div className="rounded-lg border border-secondary-200 bg-secondary-50/50 p-4 space-y-2">
                        <h4 className="text-sm font-semibold text-text">
                          Outward details
                        </h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-secondary-700">
                          <span>Item</span>
                          <span>{editingReturn.issue.item?.itemName ?? "—"}</span>
                          <span>Company</span>
                          <span>{editingReturn.issue.company?.name ?? "—"}</span>
                          <span>Contractor</span>
                          <span>{editingReturn.issue.contractor?.name ?? "—"}</span>
                          <span>Machine</span>
                          <span>{editingReturn.issue.machine?.name ?? "—"}</span>
                        </div>
                      </div>
                    )}
                    <div>
                      <Label
                        htmlFor="edit-inward-status-id"
                        className="text-sm font-medium text-secondary-700"
                      >
                        Status <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="edit-inward-status-id"
                        {...register("statusId", { valueAsNumber: true })}
                        className="mt-1.5 flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                        aria-required="true"
                      >
                        <option value="">Select status</option>
                        {statuses.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      {errors.statusId && (
                        <p className="mt-1 text-sm text-red-600" role="alert">
                          {errors.statusId.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label
                        htmlFor="edit-inward-remarks"
                        className="text-sm font-medium text-secondary-700"
                      >
                        Remarks{" "}
                        <span className="text-secondary-400 font-normal">
                          (optional)
                        </span>
                      </Label>
                      <Textarea
                        id="edit-inward-remarks"
                        {...register("remarks")}
                        placeholder="Optional remarks..."
                        rows={3}
                        className="mt-1.5 border-secondary-300 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 resize-y"
                      />
                    </div>
                  </div>

                  {/* Right column – return image (Item Master style) */}
                  <div className="lg:min-h-[320px]">
                    <div className="rounded-xl border border-secondary-200 bg-secondary-50/50 overflow-hidden h-full min-h-[260px] flex flex-col">
                      <div className="flex-1 p-4 flex flex-col">
                        <Label className="text-sm font-semibold text-text mb-1.5 block">
                          Return Image
                        </Label>
                        {editingReturn.returnImage ? (
                          <button
                            type="button"
                            onClick={() => setFullScreenImageSrc(`${API_BASE}/storage/${editingReturn.returnImage}`)}
                            className="flex-1 min-h-[220px] rounded-lg overflow-hidden border border-secondary-200 bg-white flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary-500 hover:ring-offset-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500"
                            title="View full screen"
                          >
                            <img
                              src={`${API_BASE}/storage/${editingReturn.returnImage}`}
                              alt="Return"
                              className="max-w-full max-h-full object-contain"
                            />
                          </button>
                        ) : (
                          <div className="flex-1 min-h-[220px] rounded-lg border border-secondary-200 bg-white flex items-center justify-center text-secondary-500 text-sm">
                            No image
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-none flex gap-3 px-6 py-4 border-t border-secondary-200 bg-secondary-50/50">
                {canEditInward && (
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending || !watch("statusId")}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                  >
                    {updateMutation.isPending ? "Updating…" : "Update"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEditForm}
                  className="flex-1 border-secondary-300"
                >
                  Close
                </Button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col flex-1 min-h-0 -m-6"
              aria-label="Inward entry form"
            >
              <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-4">
                <div className="grid grid-cols-1 lg:grid-cols-[65%_1fr] gap-6 lg:gap-8">
                  {/* Left column – form fields */}
                  <div className="space-y-5">
                    {nextInwardCode && (
                      <div>
                        <Label
                          htmlFor="inward-code"
                          className="text-sm font-medium text-secondary-700"
                        >
                          Inward No
                        </Label>
                        <Input
                          id="inward-code"
                          value={nextInwardCode}
                          disabled
                          readOnly
                          className="mt-1.5 h-10 bg-secondary-50 border-secondary-200"
                        />
                      </div>
                    )}

                    <div>
                      <Label
                        htmlFor="inward-issue-id"
                        className="text-sm font-medium text-secondary-700"
                      >
                        Outward (Issue) <span className="text-red-500">*</span>
                      </Label>
                      <div className="mt-1.5">
                        <SearchableSelect
                          id="inward-issue-id"
                          options={outwardOptions}
                          value={hasValidIssue ? numIssueId : ""}
                          onChange={(v) => setValue("issueId", Number(v))}
                          placeholder="Select outward entry"
                          searchPlaceholder="Search outward number..."
                          error={errors.issueId?.message}
                          aria-label="Outward issue number"
                        />
                      </div>
                    </div>

                    <div>
                      <Label
                        htmlFor="inward-status-id"
                        className="text-sm font-medium text-secondary-700"
                      >
                        Status <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="inward-status-id"
                        {...register("statusId", { valueAsNumber: true })}
                        className="mt-1.5 flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                        aria-required="true"
                      >
                        <option value="">Select status</option>
                        {statuses.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      {errors.statusId && (
                        <p className="mt-1 text-sm text-red-600" role="alert">
                          {errors.statusId.message}
                        </p>
                      )}
                    </div>

                    {displayIssue && (
                      <div className="rounded-lg border border-secondary-200 bg-secondary-50/50 p-4 space-y-2">
                        <h4 className="text-sm font-semibold text-text">
                          Outward details
                        </h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-secondary-700">
                          <span>Item</span>
                          <span>{displayIssue.item?.itemName ?? "—"}</span>
                          <span>Company</span>
                          <span>{displayIssue.company?.name ?? "—"}</span>
                          <span>Contractor</span>
                          <span>{displayIssue.contractor?.name ?? "—"}</span>
                          <span>Machine</span>
                          <span>{displayIssue.machine?.name ?? "—"}</span>
                          <span>Operator</span>
                          <span>{displayIssue.issuedTo ?? "—"}</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label
                        htmlFor="inward-remarks"
                        className="text-sm font-medium text-secondary-700"
                      >
                        Remarks{" "}
                        <span className="text-secondary-400 font-normal">
                          (optional)
                        </span>
                      </Label>
                      <Textarea
                        id="inward-remarks"
                        {...register("remarks")}
                        placeholder="Optional remarks..."
                        rows={3}
                        className="mt-1.5 border-secondary-300 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 resize-y"
                      />
                    </div>
                  </div>

                  {/* Right column – return image (Item Master style) */}
                  <div className="lg:min-h-[320px]">
                    <div className="rounded-xl border border-secondary-200 bg-secondary-50/50 overflow-hidden h-full min-h-[260px] flex flex-col">
                      <div className="flex-1 p-4 flex flex-col">
                        <CameraPhotoInput
                          label="Return Image"
                          required
                          hint="Use your camera to capture the return photo"
                          previewUrl={imagePreview}
                          onCapture={handleImageCapture}
                          aspectRatio="video"
                          onPreviewClick={(url) => setFullScreenImageSrc(url)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-none flex gap-3 px-6 py-4 border-t border-secondary-200 bg-secondary-50/50">
                {canAddInward && (
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending ||
                      !imageFile ||
                      !watch("statusId")
                    }
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                  >
                    {createMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseForm}
                  className="flex-1 border-secondary-300"
                >
                  Close
                </Button>
              </div>
            </form>
          )}
        </Dialog>

        <FullScreenImageViewer
          isOpen={!!fullScreenImageSrc}
          onClose={() => setFullScreenImageSrc(null)}
          imageSrc={fullScreenImageSrc}
          alt="Inward"
        />
      </motion.div>
    </div>
  );
}
