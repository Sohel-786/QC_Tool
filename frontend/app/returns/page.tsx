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
import { Plus, X } from "lucide-react";
import { CameraPhotoInput } from "@/components/ui/camera-photo-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatDateTime } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
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
  const [nextInwardCode, setNextInwardCode] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [filters, setFilters] = useState<TransactionFiltersState>(defaultFilters);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const prefillIssueId = searchParams.get("issueId");
  const { user: currentUser } = useCurrentUser();
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

  const handleOpenForm = async (presetIssueId?: number) => {
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
            {!isManager && (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {returns.map((r, idx) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-5 border border-secondary-200 rounded-lg hover:shadow-md transition-all bg-white"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-text mb-2">
                          {r.issue?.item?.itemName}
                        </h3>
                        {r.returnCode && (
                          <p className="text-sm text-secondary-600 mb-1">
                            <span className="font-medium">Inward No:</span>{" "}
                            {r.returnCode}
                          </p>
                        )}
                        <p className="text-sm text-secondary-600 mb-1">
                          <span className="font-medium">Issue No:</span>{" "}
                          {r.issue?.issueNo}
                        </p>
                        {r.status && (
                          <p className="text-sm text-secondary-600 mb-1">
                            <span className="font-medium">Status:</span>{" "}
                            {r.status.name}
                          </p>
                        )}
                        {r.remarks && (
                          <p className="text-sm text-secondary-500 mt-2 line-clamp-2">
                            {r.remarks}
                          </p>
                        )}
                        <p className="text-xs text-secondary-500 mt-2">
                          {formatDateTime(r.returnedAt)}
                        </p>
                      </div>
                      {r.returnImage && (
                        <div className="mt-3">
                          <img
                            src={`${API_BASE}/storage/${r.returnImage}`}
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
                    {hasActiveFilters(filters)
                      ? "No inward entries match your filters."
                      : "No inward entries yet. Create one above or from Outward."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title="Inward Entry"
          size="2xl"
          contentScroll={false}
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0 -m-6"
            aria-label="Inward entry form"
          >
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-4">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
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

                <div className="space-y-4">
                  <CameraPhotoInput
                    label="Return Image"
                    required
                    hint="Use your camera to capture the return photo"
                    previewUrl={imagePreview}
                    onCapture={handleImageCapture}
                    aspectRatio="video"
                  />
                </div>
              </div>
            </div>

            <div className="flex-none flex gap-3 px-6 py-4 border-t border-secondary-200 bg-secondary-50/50">
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
        </Dialog>
      </motion.div>
    </div>
  );
}
