"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Return, Issue, Item, Role, Status, RETURN_CONDITIONS } from "@/types";
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

const returnSchema = z
  .object({
    entryMode: z.enum(["from_outward", "missing_item"]),
    issueId: z.number(),
    itemId: z.number(),
    condition: z.enum(["OK", "Damaged", "Calibration Required", "Missing"]),
    statusId: z.number().optional(),
    remarks: z.string().optional(),
    receivedBy: z.string().optional(),
    companyId: z.number().optional(),
    contractorId: z.number().optional(),
    machineId: z.number().optional(),
    locationId: z.number().optional(),
    categoryId: z.number().optional(),
  })
  .refine(
    (data) =>
      (data.entryMode === "from_outward" && data.issueId >= 1) ||
      (data.entryMode === "missing_item" && data.itemId >= 1),
    {
      message: "Select either Outward (Issue) or Missing item",
      path: ["issueId"],
    },
  );

type ReturnForm = z.infer<typeof returnSchema>;

export default function ReturnsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<Return | null>(null);
  const [inactiveTarget, setInactiveTarget] = useState<Return | null>(null);
  const [nextInwardCode, setNextInwardCode] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fullScreenImageSrc, setFullScreenImageSrc] = useState<string | null>(
    null,
  );
  const [filters, setFilters] =
    useState<TransactionFiltersState>(defaultFilters);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const prefillIssueId = searchParams.get("issueId");
  const { user: currentUser } = useCurrentUser();
  const { data: permissions } = useCurrentUserPermissions();
  const canAddInward = permissions?.addInward ?? false;
  const canEditInward = permissions?.editInward ?? false;
  const isManager = currentUser?.role === Role.QC_MANAGER;
  const isAdmin = currentUser?.role === Role.QC_ADMIN;

  const debouncedSearch = useDebouncedValue(filters.search, 400);
  const filtersForApi = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );
  const filterKey = useMemo(
    () => JSON.stringify(filtersForApi),
    [filtersForApi],
  );

  const { data: returns = [], isFetching: returnsLoading } = useQuery<Return[]>(
    {
      queryKey: ["returns", filterKey],
      queryFn: async () => {
        const res = await api.get("/returns", {
          params: {
            ...buildFilterParams(filtersForApi),
            hideIssuedItems: "true",
          },
        });
        return res.data?.data ?? [];
      },
    },
  );

  const issueIdsWithActiveReturn = useMemo(() => {
    return new Set(
      returns
        .filter((r) => r.isActive && r.issueId)
        .map((r) => r.issueId as number),
    );
  }, [returns]);

  const { data: activeIssues = [] } = useQuery<Issue[]>({
    queryKey: ["active-issues"],
    queryFn: async () => {
      const res = await api.get("/issues/active");
      return res.data?.data ?? [];
    },
  });

  const { data: missingItems = [] } = useQuery<Item[]>({
    queryKey: ["items", "missing"],
    queryFn: async () => {
      const res = await api.get("/items/missing");
      return res.data?.data ?? [];
    },
    enabled: isFormOpen && !editingReturn,
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
  const { data: filterLocations = [] } = useQuery({
    queryKey: ["locations", "active"],
    queryFn: async () => {
      const res = await api.get("/locations/active");
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
    defaultValues: {
      entryMode: "from_outward",
      issueId: 0,
      itemId: 0,
      condition: "OK",
      statusId: undefined,
      remarks: "",
      receivedBy: "",
      companyId: undefined,
      contractorId: undefined,
      machineId: undefined,
      locationId: undefined,
      categoryId: undefined,
    },
  });

  const entryMode = watch("entryMode");
  const selectedIssueId = watch("issueId");
  const selectedItemId = watch("itemId");
  const condition = watch("condition");
  const numIssueId =
    typeof selectedIssueId === "number"
      ? selectedIssueId
      : Number(selectedIssueId);
  const numItemId =
    typeof selectedItemId === "number"
      ? selectedItemId
      : Number(selectedItemId);
  const hasValidIssue = !Number.isNaN(numIssueId) && numIssueId > 0;
  const hasValidMissingItem = !Number.isNaN(numItemId) && numItemId > 0;
  const watchedCategoryId = watch("categoryId");
  const displayIssue = hasValidIssue
    ? ((prefetchedIssue?.id === numIssueId
      ? prefetchedIssue
      : activeIssues.find((i) => i.id === numIssueId)) ?? null)
    : null;
  const displayMissingItem = hasValidMissingItem
    ? (missingItems.find((i) => i.id === numItemId) ?? null)
    : null;

  const outwardOptions = useMemo(
    () =>
      activeIssues.map((issue) => ({
        value: issue.id,
        label: issue.issueNo,
      })),
    [activeIssues],
  );

  const missingItemOptions = useMemo(() => {
    let result = missingItems;
    if (watchedCategoryId && watchedCategoryId >= 1) {
      result = result.filter((i) => i.categoryId === watchedCategoryId);
    }
    return result.map((item) => ({
      value: item.id,
      label: item.serialNumber
        ? `${item.itemName} (${item.serialNumber})`
        : item.itemName,
    }));
  }, [missingItems, watchedCategoryId]);

  const isMissingItemMode = entryMode === "missing_item";
  const isFromOutwardMode = entryMode === "from_outward";
  const imageRequired = isFromOutwardMode && condition !== "Missing";

  const { data: filterCategories = [] } = useQuery({
    queryKey: ["item-categories", "active"],
    queryFn: async () => {
      const res = await api.get("/item-categories/active");
      return res.data?.data ?? [];
    },
  });

  const filterOptions = useMemo(() => {
    const filteredLocations =
      filters.companyIds.length > 0
        ? filterLocations.filter(
          (l: { companyId: number; id: number; name: string }) =>
            filters.companyIds.includes(l.companyId),
        )
        : filterLocations;

    const filteredMachines =
      filters.contractorIds.length > 0
        ? filterMachines.filter(
          (m: { contractorId: number; id: number; name: string }) =>
            filters.contractorIds.includes(m.contractorId),
        )
        : filterMachines;

    const filteredItems =
      filters.itemCategoryIds.length > 0
        ? filterItems.filter(
          (i: { categoryId?: number | null; id: number; itemName: string }) =>
            i.categoryId != null &&
            filters.itemCategoryIds.includes(i.categoryId),
        )
        : filterItems;

    return {
      company: filterCompanies.map((c: { id: number; name: string }) => ({
        value: c.id,
        label: c.name,
      })),
      location: filteredLocations.map((l: { id: number; name: string }) => ({
        value: l.id,
        label: l.name,
      })),
      contractor: filterContractors.map((c: { id: number; name: string }) => ({
        value: c.id,
        label: c.name,
      })),
      machine: filteredMachines.map((m: { id: number; name: string }) => ({
        value: m.id,
        label: m.name,
      })),
      category: filterCategories.map((c: { id: number; name: string }) => ({
        value: c.id,
        label: c.name,
      })),
      condition: RETURN_CONDITIONS.map((c) => ({ value: c, label: c })),
      item: filteredItems.map(
        (i: {
          id: number;
          itemName: string;
          serialNumber?: string | null;
        }) => ({
          value: i.id,
          label: i.serialNumber
            ? `${i.itemName} (${i.serialNumber})`
            : i.itemName,
        }),
      ),
    };
  }, [
    filterCompanies,
    filterContractors,
    filterMachines,
    filterLocations,
    filterItems,
    filterCategories,
    filters.companyIds,
    filters.contractorIds,
    filters.itemCategoryIds,
  ]);

  const watchedCompanyId = watch("companyId");
  const watchedContractorId = watch("contractorId");

  const locationFormOptions = useMemo(() => {
    if (!watchedCompanyId) return [];
    return filterLocations
      .filter((l: any) => l.companyId === watchedCompanyId)
      .map((l: any) => ({ value: l.id, label: l.name }));
  }, [filterLocations, watchedCompanyId]);

  const machineFormOptions = useMemo(() => {
    if (!watchedContractorId) return [];
    return filterMachines
      .filter((m: any) => m.contractorId === watchedContractorId)
      .map((m: any) => ({ value: m.id, label: m.name }));
  }, [filterMachines, watchedContractorId]);

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
      queryClient.invalidateQueries({ queryKey: ["items", "missing"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
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
      data: {
        remarks?: string;
        receivedBy?: string;
        statusId?: number | null;
        condition?: string;
      };
    }) => {
      const res = await api.patch(`/returns/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
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
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["active-issues"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
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
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["active-issues"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
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
    reset({
      entryMode: "from_outward",
      issueId: presetIssueId ?? 0,
      itemId: 0,
      condition: "OK",
      statusId: undefined,
      remarks: "",
      receivedBy: "",
      companyId: undefined,
      contractorId: undefined,
      machineId: undefined,
      locationId: undefined,
    });
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
    setValue("issueId", r.issueId as number);
    setValue("statusId", r.statusId ?? 0);
    setValue("condition", r.condition as any);
    setValue("remarks", r.remarks ?? "");
    setValue("receivedBy", r.receivedBy ?? "");
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
        receivedBy: data.receivedBy,
        statusId: data.statusId ?? null,
        condition: data.condition,
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
    if (isFormOpen && !editingReturn) {
      setTimeout(() => {
        if (isFromOutwardMode) {
          document.getElementById("inward-issue-id")?.focus();
        } else if (isMissingItemMode) {
          document.getElementById("inward-missing-company")?.focus();
        }
      }, 300);
    }
  }, [isFormOpen, editingReturn, isFromOutwardMode, isMissingItemMode]);

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
    if (imageRequired && !imageFile) {
      toast.error("Return image is required for this condition.");
      return;
    }
    const formData = new FormData();
    formData.append("condition", data.condition);
    if (data.entryMode === "from_outward") {
      formData.append("issueId", String(data.issueId));
    } else {
      formData.append("itemId", String(data.itemId));
    }
    if (data.statusId != null && data.statusId >= 1)
      formData.append("statusId", String(data.statusId));
    if (imageFile) formData.append("image", imageFile);
    if (data.remarks) formData.append("remarks", data.remarks);
    if (data.receivedBy?.trim())
      formData.append("receivedBy", data.receivedBy.trim());
    if (data.entryMode === "missing_item") {
      if (data.companyId != null && data.companyId >= 1)
        formData.append("companyId", String(data.companyId));
      if (data.contractorId != null && data.contractorId >= 1)
        formData.append("contractorId", String(data.contractorId));
      if (data.machineId != null && data.machineId >= 1)
        formData.append("machineId", String(data.machineId));
      if (data.locationId != null && data.locationId >= 1)
        formData.append("locationId", String(data.locationId));
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
            locationOptions={filterOptions.location}
            contractorOptions={filterOptions.contractor}
            machineOptions={filterOptions.machine}
            itemCategoryOptions={filterOptions.category}
            itemOptions={filterOptions.item}
            showConditionFilter={true}
            conditionOptions={filterOptions.condition}
            hideOperatorFilter={true}
            showReceivedByFilter={true}
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
                <div className="overflow-x-auto overflow-y-hidden rounded-lg border border-secondary-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-primary-200 bg-primary-100">
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[100px]">
                          Inward No
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[150px]">
                          Inward Date
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[120px]">
                          Issue No / Source
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[140px]">
                          Item
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[110px]">
                          Condition
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[120px]">
                          Company
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[120px]">
                          Contractor
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[120px]">
                          Machine
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[120px]">
                          Location
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[90px]">
                          Status
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[110px]">
                          Received by
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[80px]">
                          Status
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center w-[60px] min-w-[60px]">
                          Image
                        </th>
                        {(canAddInward || canEditInward) && (
                          <th className="px-4 py-3 font-semibold text-primary-900 text-center min-w-[160px]">
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
                          className="border-b border-secondary-100 hover:bg-primary-50 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-secondary-700 text-center">
                            {r.returnCode ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600 text-center">
                            {formatDateTime(r.returnedAt)}
                          </td>
                          <td className="px-4 py-3 font-mono text-secondary-700 text-center">
                            {r.issueId != null
                              ? (r.issue?.issueNo ?? "—")
                              : "Missing item"}
                          </td>
                          <td className="px-4 py-3 font-medium text-text text-center">
                            {r.issue?.item?.itemName ?? r.item?.itemName ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${r.condition === "OK"
                                ? "bg-green-100 text-green-700 border-green-200"
                                : r.condition === "Damaged"
                                  ? "bg-amber-100 text-amber-700 border-amber-200"
                                  : r.condition === "Calibration Required"
                                    ? "bg-blue-100 text-blue-700 border-blue-200"
                                    : r.condition === "Missing"
                                      ? "bg-red-100 text-red-700 border-red-200"
                                      : "bg-secondary-100 text-secondary-700 border-secondary-200"
                                }`}
                            >
                              {r.condition ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-secondary-600 text-center min-w-[120px]">
                            {r.issue?.company?.name ?? r.company?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600 text-center min-w-[120px]">
                            {r.issue?.contractor?.name ??
                              r.contractor?.name ??
                              "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600 text-center min-w-[120px]">
                            {r.issue?.machine?.name ?? r.machine?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600 text-center min-w-[120px]">
                            {r.issue?.location?.name ?? r.location?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {r.status?.name ? (
                              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 border border-primary-200">
                                {r.status.name}
                              </span>
                            ) : (
                              <span className="text-secondary-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-secondary-600 text-center">
                            {r.receivedBy?.trim() ? r.receivedBy : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${r.isActive
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
                                onClick={() =>
                                  setFullScreenImageSrc(
                                    r.returnImage?.startsWith("/")
                                      ? `${API_BASE}${r.returnImage}`
                                      : `${API_BASE}/storage/${r.returnImage}`,
                                  )
                                }
                                className="w-[30px] h-[30px] rounded border border-secondary-200 inline-block overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-500 transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500"
                                title="View full screen"
                              >
                                <img
                                  src={
                                    r.returnImage?.startsWith("/")
                                      ? `${API_BASE}${r.returnImage}`
                                      : `${API_BASE}/storage/${r.returnImage}`
                                  }
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
                                {isAdmin && (
                                  <>
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
                                        onClick={() =>
                                          setActiveMutation.mutate(r.id)
                                        }
                                        title={
                                          r.issueId &&
                                            issueIdsWithActiveReturn.has(
                                              r.issueId,
                                            )
                                            ? "Another inward is already active for this outward"
                                            : "Mark inward active"
                                        }
                                        className="shrink-0 text-green-600 hover:bg-green-50"
                                        disabled={
                                          setActiveMutation.isPending ||
                                          (!!r.issueId &&
                                            issueIdsWithActiveReturn.has(
                                              r.issueId,
                                            ))
                                        }
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </>
                                )}
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
                  {setInactiveMutation.isPending
                    ? "Updating…"
                    : "Mark inactive"}
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
              className="flex flex-col flex-1 min-h-0"
              aria-label="Edit inward form"
            >
              <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-3 pb-2">
                <div className="grid grid-cols-1 lg:grid-cols-[65%_1fr] gap-3 lg:gap-4">
                  {/* Left column – form fields */}
                  <div className="space-y-3">
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
                          {editingReturn.issueId != null
                            ? "Issue No"
                            : "Source"}
                        </Label>
                        <Input
                          value={
                            editingReturn.issueId != null
                              ? (editingReturn.issue?.issueNo ?? "—")
                              : "Missing item"
                          }
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
                          <span>
                            {editingReturn.issue.item?.itemName ?? "—"}
                          </span>
                          <span>Serial No.</span>
                          <span>
                            {editingReturn.issue?.item?.serialNumber ?? "—"}
                          </span>
                          <span>Company</span>
                          <span>
                            {editingReturn.issue.company?.name ?? "—"}
                          </span>
                          <span>Contractor</span>
                          <span>
                            {editingReturn.issue.contractor?.name ?? "—"}
                          </span>
                          <span>Machine</span>
                          <span>
                            {editingReturn.issue.machine?.name ?? "—"}
                          </span>
                          <span>Location</span>
                          <span>
                            {editingReturn.issue?.location?.name ?? "—"}
                          </span>
                        </div>
                      </div>
                    )}
                    {editingReturn.itemId != null && editingReturn.item && (
                      <div className="rounded-lg border border-secondary-200 bg-secondary-50/50 p-4 space-y-2">
                        <h4 className="text-sm font-semibold text-text">
                          Missing item
                        </h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-secondary-700">
                          <span>Source Inward No</span>
                          <span>{editingReturn.sourceInwardCode ?? "—"}</span>
                          <span>Item</span>
                          <span>{editingReturn.item.itemName}</span>
                          <span>Serial No.</span>
                          <span>{editingReturn.item.serialNumber ?? "—"}</span>
                          <span>Company</span>
                          <span>{editingReturn.company?.name ?? "—"}</span>
                          <span>Contractor</span>
                          <span>{editingReturn.contractor?.name ?? "—"}</span>
                          <span>Machine</span>
                          <span>{editingReturn.machine?.name ?? "—"}</span>
                          <span>Location</span>
                          <span>{editingReturn.location?.name ?? "—"}</span>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label
                          htmlFor="edit-inward-condition"
                          className="text-sm font-medium text-secondary-700"
                        >
                          Condition <span className="text-red-500">*</span>
                        </Label>
                        <select
                          id="edit-inward-condition"
                          {...register("condition")}
                          className="mt-1 flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                        >
                          {RETURN_CONDITIONS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
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
                          className="mt-1 flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                          aria-required="true"
                        >
                          {statuses.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label
                          htmlFor="edit-inward-received-by"
                          className="text-sm font-medium text-secondary-700"
                        >
                          Received by <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit-inward-received-by"
                          {...register("receivedBy")}
                          placeholder="Who received"
                          className="mt-1 h-10 border-secondary-300"
                        />
                      </div>
                    </div>
                    <div>
                      <Label
                        htmlFor="edit-inward-remarks"
                        className="text-sm font-medium text-secondary-700"
                      >
                        Remarks <span className="text-secondary-400 font-normal">(opt)</span>
                      </Label>
                      <Textarea
                        id="edit-inward-remarks"
                        {...register("remarks")}
                        placeholder="Optional remarks..."
                        rows={1}
                        className="mt-1 border-secondary-300 resize-none h-12"
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
                            onClick={() =>
                              setFullScreenImageSrc(
                                `${API_BASE}/storage/${editingReturn.returnImage}`,
                              )
                            }
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
              <div className="flex-none flex gap-3 px-6 py-3 border-t border-secondary-200 bg-secondary-50/50 rounded-b-[2rem]">
                {canEditInward && (
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending || !watch("condition") || !watch("statusId") || !watch("receivedBy")?.trim()}
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
              className="flex flex-col flex-1 min-h-0"
              aria-label="Inward entry form"
            >
              <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-3 pb-2">
                <div className="grid grid-cols-1 lg:grid-cols-[65%_1fr] gap-3 lg:gap-4">
                  {/* Left column – form fields */}
                  <div className="space-y-3">
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
                      <Label className="text-sm font-medium text-secondary-700 block mb-2">
                        Entry type
                      </Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={isFromOutwardMode}
                            onChange={() => {
                              setValue("entryMode", "from_outward");
                              setValue("itemId", 0);
                            }}
                            className="rounded-full border-secondary-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm">
                            Return from Outward (Issue)
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={isMissingItemMode}
                            onChange={() => {
                              setValue("entryMode", "missing_item");
                              setValue("issueId", 0);
                            }}
                            className="rounded-full border-secondary-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm">Receive Missing Item</span>
                        </label>
                      </div>
                    </div>

                    {isFromOutwardMode && (
                      <div>
                        <Label
                          htmlFor="inward-issue-id"
                          className="text-sm font-medium text-secondary-700"
                        >
                          Outward (Issue No){" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <div className="mt-1.5">
                          <SearchableSelect
                            id="inward-issue-id"
                            options={outwardOptions}
                            value={hasValidIssue ? numIssueId : ""}
                            onChange={(v: any) => {
                              setValue("issueId", Number(v));
                              setTimeout(() => {
                                document.getElementById("inward-condition")?.focus();
                              }, 100);
                            }}
                            placeholder="Select outward entry"
                            searchPlaceholder="Search outward number..."
                            error={errors.issueId?.message}
                            aria-label="Outward issue number"
                          />
                        </div>
                      </div>
                    )}

                    {isMissingItemMode && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label
                              htmlFor="inward-missing-company"
                              className="text-sm font-medium text-secondary-700"
                            >
                              Company
                            </Label>
                            <div className="mt-1.5">
                              <SearchableSelect
                                id="inward-missing-company"
                                options={filterOptions.company}
                                value={
                                  watch("companyId") &&
                                    Number(watch("companyId")) >= 1
                                    ? Number(watch("companyId"))
                                    : ""
                                }
                                onChange={(v) => {
                                  setValue(
                                    "companyId",
                                    v ? Number(v) : undefined,
                                  );
                                  setValue("locationId", undefined);
                                  setTimeout(() => {
                                    document.getElementById("inward-missing-location")?.focus();
                                  }, 100);
                                }}
                                placeholder="Select company"
                                searchPlaceholder="Search company..."
                                aria-label="Company"
                              />
                            </div>
                          </div>
                          <div>
                            <Label
                              htmlFor="inward-missing-location"
                              className="text-sm font-medium text-secondary-700"
                            >
                              Location
                            </Label>
                            <div className="mt-1.5">
                              <SearchableSelect
                                id="inward-missing-location"
                                options={locationFormOptions}
                                value={
                                  watch("locationId") &&
                                    Number(watch("locationId")) >= 1
                                    ? Number(watch("locationId"))
                                    : ""
                                }
                                onChange={(v) => {
                                  setValue(
                                    "locationId",
                                    v ? Number(v) : undefined,
                                  );
                                  setTimeout(() => {
                                    document.getElementById("inward-missing-contractor")?.focus();
                                  }, 100);
                                }}
                                disabled={!watchedCompanyId}
                                placeholder={
                                  watchedCompanyId
                                    ? "Select location"
                                    : "Select company first"
                                }
                                searchPlaceholder="Search location..."
                                aria-label="Location"
                              />
                            </div>
                          </div>
                          <div>
                            <Label
                              htmlFor="inward-missing-contractor"
                              className="text-sm font-medium text-secondary-700"
                            >
                              Contractor
                            </Label>
                            <div className="mt-1.5">
                              <SearchableSelect
                                id="inward-missing-contractor"
                                options={filterOptions.contractor}
                                value={
                                  watch("contractorId") &&
                                    Number(watch("contractorId")) >= 1
                                    ? Number(watch("contractorId"))
                                    : ""
                                }
                                onChange={(v) => {
                                  setValue(
                                    "contractorId",
                                    v ? Number(v) : undefined,
                                  );
                                  setValue("machineId", undefined);
                                  setTimeout(() => {
                                    document.getElementById("inward-missing-machine")?.focus();
                                  }, 100);
                                }}
                                placeholder="Select contractor"
                                searchPlaceholder="Search contractor..."
                                aria-label="Contractor"
                              />
                            </div>
                          </div>
                          <div>
                            <Label
                              htmlFor="inward-missing-machine"
                              className="text-sm font-medium text-secondary-700"
                            >
                              Machine
                            </Label>
                            <div className="mt-1.5">
                              <SearchableSelect
                                id="inward-missing-machine"
                                options={machineFormOptions}
                                value={
                                  watch("machineId") &&
                                    Number(watch("machineId")) >= 1
                                    ? Number(watch("machineId"))
                                    : ""
                                }
                                onChange={(v) => {
                                  setValue(
                                    "machineId",
                                    v ? Number(v) : undefined,
                                  );
                                  setTimeout(() => {
                                    document.getElementById("inward-category-id")?.focus();
                                  }, 100);
                                }}
                                disabled={!watchedContractorId}
                                placeholder={
                                  watchedContractorId
                                    ? "Select machine"
                                    : "Select contractor first"
                                }
                                searchPlaceholder="Search machine..."
                                aria-label="Machine"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label
                              htmlFor="inward-category-id"
                              className="text-sm font-medium text-secondary-700"
                            >
                              Item Category
                            </Label>
                            <div className="mt-1.5">
                              <SearchableSelect
                                id="inward-category-id"
                                options={filterOptions.category}
                                value={watchedCategoryId ?? ""}
                                onChange={(v) => {
                                  setValue(
                                    "categoryId",
                                    v ? Number(v) : undefined,
                                  );
                                  setValue("itemId", 0);
                                  setTimeout(() => {
                                    document.getElementById("inward-item-id")?.focus();
                                  }, 100);
                                }}
                                placeholder="Select category"
                                searchPlaceholder="Search categories..."
                                aria-label="Item Category"
                              />
                            </div>
                          </div>
                          <div>
                            <Label
                              htmlFor="inward-item-id"
                              className="text-sm font-medium text-secondary-700"
                            >
                              Missing item{" "}
                              <span className="text-red-500">*</span>
                            </Label>
                            <div className="mt-1.5">
                              <SearchableSelect
                                id="inward-item-id"
                                options={missingItemOptions}
                                value={hasValidMissingItem ? numItemId : ""}
                                onChange={(v) => {
                                  setValue("itemId", Number(v));
                                  setTimeout(() => {
                                    document.getElementById("inward-condition")?.focus();
                                  }, 100);
                                }}
                                placeholder={
                                  watchedCategoryId
                                    ? "Select missing item"
                                    : "Select category or search all..."
                                }
                                searchPlaceholder="Search item..."
                                error={errors.itemId?.message}
                                aria-label="Missing item"
                              />
                            </div>
                            <p className="mt-1 text-[11px] text-secondary-500">
                              Items previously inwarded as Missing appear here.
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label
                          htmlFor="inward-condition"
                          className="text-sm font-medium text-secondary-700"
                        >
                          Condition <span className="text-red-500">*</span>
                        </Label>
                        <select
                          id="inward-condition"
                          {...register("condition")}
                          onChange={(e) => {
                            register("condition").onChange(e);
                            setTimeout(() => {
                              document.getElementById("inward-status-id")?.focus();
                            }, 50);
                          }}
                          className="mt-1 flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                          aria-required="true"
                        >
                          {RETURN_CONDITIONS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
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
                          onChange={(e) => {
                            register("statusId", { valueAsNumber: true }).onChange(e);
                            setTimeout(() => {
                              document.getElementById("inward-received-by")?.focus();
                            }, 50);
                          }}
                          className="mt-1 flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                        >
                          {statuses.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label
                          htmlFor="inward-received-by"
                          className="text-sm font-medium text-secondary-700"
                        >
                          Received by <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="inward-received-by"
                          {...register("receivedBy")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              document.getElementById("inward-remarks")?.focus();
                            }
                          }}
                          placeholder="Who received"
                          className="mt-1 border-secondary-300 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 h-10"
                        />
                      </div>
                    </div>

                    {displayIssue && isFromOutwardMode && (
                      <div className="rounded-lg border border-secondary-200 bg-secondary-50/50 p-4 space-y-2">
                        <h4 className="text-sm font-semibold text-text">
                          Outward details
                        </h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-secondary-700">
                          <span>Company</span>
                          <span>{displayIssue.company?.name ?? "—"}</span>
                          <span>Location</span>
                          <span>{displayIssue.location?.name ?? "—"}</span>
                          <span>Contractor</span>
                          <span>{displayIssue.contractor?.name ?? "—"}</span>
                          <span>Machine</span>
                          <span>{displayIssue.machine?.name ?? "—"}</span>
                          <span>Category</span>
                          <span>
                            {filterOptions.category.find(
                              (c: any) =>
                                c.value === displayIssue.item?.categoryId,
                            )?.label ?? "—"}
                          </span>
                          <span>Item</span>
                          <span>{displayIssue.item?.itemName ?? "—"}</span>
                          <span>Operator</span>
                          <span>{displayIssue.issuedTo ?? "—"}</span>
                        </div>
                      </div>
                    )}

                    {displayMissingItem && isMissingItemMode && (
                      <div className="rounded-lg border border-secondary-200 bg-secondary-50/50 p-4 space-y-2">
                        <h4 className="text-sm font-semibold text-text">
                          Missing item
                        </h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-secondary-700">
                          <span>Inward No</span>
                          <span>{nextInwardCode ?? "—"}</span>
                          <span>Company</span>
                          <span>
                            {filterOptions.company.find(
                              (c: any) => c.value === watch("companyId"),
                            )?.label ?? "—"}
                          </span>
                          <span>Location</span>
                          <span>
                            {filterOptions.location.find(
                              (l: any) => l.value === watch("locationId"),
                            )?.label ?? "—"}
                          </span>
                          <span>Contractor</span>
                          <span>
                            {filterOptions.contractor.find(
                              (c: any) => c.value === watch("contractorId"),
                            )?.label ?? "—"}
                          </span>
                          <span>Machine</span>
                          <span>
                            {filterOptions.machine.find(
                              (m: any) => m.value === watch("machineId"),
                            )?.label ?? "—"}
                          </span>
                          <span>Category</span>
                          <span>
                            {filterOptions.category.find(
                              (c: any) => c.value === watch("categoryId"),
                            )?.label ?? "—"}
                          </span>
                          <span>Item</span>
                          <span>{displayMissingItem.itemName}</span>
                          <span>Serial</span>
                          <span>{displayMissingItem.serialNumber ?? "—"}</span>
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
                        rows={1}
                        className="mt-1 border-secondary-300 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 resize-none"
                      />
                    </div>
                  </div>

                  {/* Right column – return image (Item Master style) */}
                  <div className="lg:min-h-[320px]">
                    <div className="rounded-xl border border-secondary-200 bg-secondary-50/50 overflow-hidden h-full min-h-[260px] flex flex-col">
                      <div className="flex-1 p-4 flex flex-col">
                        <CameraPhotoInput
                          label="Return Image"
                          required={imageRequired}
                          hint={
                            imageRequired
                              ? "Use your camera to capture the return photo"
                              : "Optional for Missing condition or Receive Missing Item"
                          }
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

              <div className="flex-none flex gap-3 px-6 py-3 border-t border-secondary-200 bg-secondary-50/50 rounded-b-[2rem]">
                {canAddInward && (
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending ||
                      (imageRequired && !imageFile) ||
                      !watch("condition") ||
                      !watch("statusId") ||
                      !watch("receivedBy")?.trim() ||
                      (isFromOutwardMode && !hasValidIssue) ||
                      (isMissingItemMode && !hasValidMissingItem)
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
    </div >
  );
}
