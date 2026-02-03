"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  Issue,
  Item,
  ItemCategory,
  Company,
  Contractor,
  Machine,
  Location,
  Role,
  ItemStatus,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  Edit2,
  Ban,
  CheckCircle,
  LogIn,
  Image as ImageIcon,
} from "lucide-react";
import { FullScreenImageViewer } from "@/components/ui/full-screen-image-viewer";
import { formatDate } from "@/lib/utils";
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
import { ItemSelectionDialog } from "@/components/dialogs/item-selection-dialog";
import { cn } from "@/lib/utils";

const issueSchema = z.object({
  categoryId: z.number().min(1, "Item category is required"),
  itemId: z.number().min(1, "Item is required"),
  companyId: z.number().min(1, "Company is required"),
  contractorId: z.number().min(1, "Contractor is required"),
  machineId: z.number().min(1, "Machine is required"),
  locationId: z.number().min(1, "Location is required"),
  issuedTo: z.string().optional(),
  remarks: z.string().optional(),
});

type IssueForm = z.infer<typeof issueSchema>;

export default function IssuesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [inactiveTarget, setInactiveTarget] = useState<Issue | null>(null);
  const [nextIssueCode, setNextIssueCode] = useState<string>("");
  const [filters, setFilters] =
    useState<TransactionFiltersState>(defaultFilters);
  const [fullScreenImageSrc, setFullScreenImageSrc] = useState<string | null>(
    null,
  );
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user: currentUser } = useCurrentUser();
  const { data: permissions } = useCurrentUserPermissions();
  const canAddOutward = permissions?.addOutward ?? false;
  const canEditOutward = permissions?.editOutward ?? false;
  const isManager = currentUser?.role === Role.QC_MANAGER;
  const isAdmin = currentUser?.role === Role.QC_ADMIN;
  const isViewOnly = !!editingIssue?.isReturned;

  const debouncedSearch = useDebouncedValue(filters.search, 400);
  const filtersForApi = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );
  const filterKey = useMemo(
    () => JSON.stringify(filtersForApi),
    [filtersForApi],
  );

  const { data: issues = [], isFetching: issuesLoading } = useQuery<Issue[]>({
    queryKey: ["issues", filterKey],
    queryFn: async () => {
      const res = await api.get("/issues", {
        params: {
          ...buildFilterParams(filtersForApi),
          onlyPendingInward: "true",
        },
      });
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

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["companies", "active"],
    queryFn: async () => {
      const res = await api.get("/companies/active");
      return res.data?.data ?? [];
    },
  });

  const { data: contractors = [] } = useQuery<Contractor[]>({
    queryKey: ["contractors", "active"],
    queryFn: async () => {
      const res = await api.get("/contractors/active");
      return res.data?.data ?? [];
    },
  });

  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ["machines", "active"],
    queryFn: async () => {
      const res = await api.get("/machines/active");
      return res.data?.data ?? [];
    },
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["locations", "active"],
    queryFn: async () => {
      const res = await api.get("/locations/active");
      return res.data?.data ?? [];
    },
  });

  const { data: filterItems = [] } = useQuery<Item[]>({
    queryKey: ["items", "active"],
    queryFn: async () => {
      const res = await api.get("/items/active");
      return res.data?.data ?? [];
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

  const selectedCategoryId = watch("categoryId");
  const selectedItemId = watch("itemId");
  const watchedCompanyId = watch("companyId");
  const watchedContractorId = watch("contractorId");
  const watchedMachineId = watch("machineId");
  const watchedLocationId = watch("locationId");

  const hasAllRequired =
    typeof selectedCategoryId === "number" &&
    !Number.isNaN(selectedCategoryId) &&
    selectedCategoryId >= 1 &&
    typeof selectedItemId === "number" &&
    !Number.isNaN(selectedItemId) &&
    selectedItemId >= 1 &&
    typeof watchedCompanyId === "number" &&
    !Number.isNaN(watchedCompanyId) &&
    watchedCompanyId >= 1 &&
    typeof watchedContractorId === "number" &&
    !Number.isNaN(watchedContractorId) &&
    watchedContractorId >= 1 &&
    typeof watchedMachineId === "number" &&
    !Number.isNaN(watchedMachineId) &&
    watchedMachineId >= 1 &&
    typeof watchedLocationId === "number" &&
    !Number.isNaN(watchedLocationId) &&
    watchedLocationId >= 1;

  const { data: itemsByCategory = [], isLoading: itemsLoading } = useQuery<
    Item[]
  >({
    queryKey: ["items-by-category", selectedCategoryId],
    queryFn: async () => {
      if (!selectedCategoryId || selectedCategoryId === 0) return [];
      const res = await api.get(`/items/by-category/${selectedCategoryId}`);
      return res.data?.data ?? [];
    },
    enabled: !!selectedCategoryId && selectedCategoryId !== 0,
  });

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return itemsByCategory.find((i) => i.id === selectedItemId) ?? null;
  }, [selectedItemId, itemsByCategory]);

  const createMutation = useMutation({
    mutationFn: async (data: IssueForm) => {
      const res = await api.post("/issues", {
        ...data,
        categoryId: data.categoryId,
        itemId: data.itemId,
        companyId: data.companyId || undefined,
        contractorId: data.contractorId || undefined,
        machineId: data.machineId || undefined,
        locationId: data.locationId || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["active-issues"] });
      queryClient.invalidateQueries({ queryKey: ["items-by-category"] });
      queryClient.invalidateQueries({ queryKey: ["available-items"] });
      handleCloseForm();
      toast.success("Outward entry created");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create outward entry.";
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<IssueForm>;
    }) => {
      const res = await api.patch(`/issues/${id}`, {
        companyId: data.companyId ?? undefined,
        contractorId: data.contractorId ?? undefined,
        machineId: data.machineId ?? undefined,
        locationId: data.locationId ?? undefined,
        issuedTo: data.issuedTo ?? undefined,
        remarks: data.remarks ?? undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["active-issues"] });
      handleCloseForm();
      toast.success("Outward entry updated");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update outward entry.";
      toast.error(msg);
    },
  });

  const setInactiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.patch(`/issues/${id}/inactive`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["active-issues"] });
      setInactiveTarget(null);
      toast.success("Outward marked inactive");
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
      const res = await api.patch(`/issues/${id}/active`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["active-issues"] });
      toast.success("Outward marked active");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update.";
      toast.error(msg);
    },
  });

  useEffect(() => {
    if (!isFormOpen) return;
    const t = setTimeout(() => {
      const el = editingIssue
        ? document.getElementById("outward-company-id")
        : document.getElementById("outward-category-id");
      el?.focus();
    }, 100);
    return () => clearTimeout(t);
  }, [isFormOpen, editingIssue]);

  const handleOpenForm = async () => {
    setEditingIssue(null);
    reset();
    try {
      const res = await api.get("/issues/next-code");
      setNextIssueCode(res.data?.data?.nextCode ?? "");
    } catch {
      setNextIssueCode("");
    }
    setIsFormOpen(true);
  };

  const handleOpenEdit = (issue: Issue) => {
    setEditingIssue(issue);
    setNextIssueCode("");
    reset();
    setValue("categoryId", issue.item?.categoryId ?? 0);
    setValue("itemId", issue.itemId);
    setValue("companyId", issue.companyId ?? 0);
    setValue("contractorId", issue.contractorId ?? 0);
    setValue("machineId", issue.machineId ?? 0);
    setValue("locationId", issue.locationId ?? 0);
    setValue("issuedTo", issue.issuedTo ?? "");
    setValue("remarks", issue.remarks ?? "");
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingIssue(null);
    reset();
    setNextIssueCode("");
    setIsItemDialogOpen(false);
    createMutation.reset();
    updateMutation.reset();
  };

  const onSubmit = (data: IssueForm) => {
    if (editingIssue) {
      if (editingIssue.isReturned) return;
      updateMutation.mutate({
        id: editingIssue.id,
        data: {
          companyId: data.companyId,
          contractorId: data.contractorId,
          machineId: data.machineId,
          issuedTo: data.issuedTo,
          remarks: data.remarks,
        },
      });
    } else {
      createMutation.mutate({
        ...data,
        categoryId: Number(data.categoryId),
        itemId: Number(data.itemId),
      });
    }
  };

  const handleMarkInactiveConfirm = () => {
    if (!inactiveTarget) return;
    setInactiveMutation.mutate(inactiveTarget.id);
  };

  const filterOptions = useMemo(
    () => ({
      company: companies.map((c) => ({ value: c.id, label: c.name })),
      contractor: contractors.map((c) => ({ value: c.id, label: c.name })),
      machine: machines.map((m) => ({ value: m.id, label: m.name })),
      location: locations.map((l) => ({ value: l.id, label: l.name })),
      item: filterItems.map((i) => ({
        value: i.id,
        label: i.serialNumber
          ? `${i.itemName} (${i.serialNumber})`
          : i.itemName,
      })),
    }),
    [companies, contractors, machines, locations, filterItems],
  );

  const categorySelectOptions = useMemo(() => {
    return categories.map((c) => ({ value: c.id, label: c.name }));
  }, [categories]);

  const companySelectOptions = useMemo(() => {
    return companies.map((c) => ({ value: c.id, label: c.name }));
  }, [companies]);

  const contractorSelectOptions = useMemo(() => {
    return contractors.map((c) => ({ value: c.id, label: c.name }));
  }, [contractors]);

  const machineSelectOptions = useMemo(() => {
    return machines.map((m) => ({ value: m.id, label: m.name }));
  }, [machines]);

  const locationSelectOptions = useMemo(() => {
    return locations.map((l) => ({ value: l.id, label: l.name }));
  }, [locations]);

  const itemSelectOptions = useMemo(() => {
    return itemsByCategory.map((item) => ({
      value: item.id,
      label: `${item.itemName}${item.serialNumber ? ` (${item.serialNumber})` : ""}${item.status !== ItemStatus.AVAILABLE ? ` — ${item.status}` : ""}`,
      disabled: item.status !== ItemStatus.AVAILABLE,
    }));
  }, [itemsByCategory]);

  const goToInward = (issue: Issue) => {
    router.push(`/returns?issueId=${issue.id}`);
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
              <h1 className="text-3xl font-bold text-text mb-2">Outward</h1>
              <p className="text-secondary-600">
                {isManager
                  ? "View outward entries"
                  : "Create and manage outward entries"}
              </p>
            </div>
            {canAddOutward && (
              <Button onClick={handleOpenForm} className="shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Outward Entry
              </Button>
            )}
          </div>

          <TransactionFilters
            filters={filters}
            onFiltersChange={setFilters}
            companyOptions={filterOptions.company}
            contractorOptions={filterOptions.contractor}
            machineOptions={filterOptions.machine}
            locationOptions={filterOptions.location}
            itemOptions={filterOptions.item}
            onClear={() => setFilters(defaultFilters)}
            searchPlaceholder="Search by outward no., item, company, location, operator…"
            className="shadow-sm"
          />

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Outward Entries ({issues.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {issuesLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                </div>
              ) : issues.length > 0 ? (
                <div className="overflow-x-auto overflow-y-hidden rounded-lg border border-secondary-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-primary-200 bg-primary-100">
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[110px]">
                          Issue No
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[120px]">
                          Outward Date
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[140px]">
                          Item
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
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[100px]">
                          Operator
                        </th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[90px]">
                          Status
                        </th>
                        {/* <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[100px]">
                          Inward Done
                        </th> */}
                        {(canAddOutward || canEditOutward) && (
                          <th className="px-4 py-3 font-semibold text-primary-900 text-center min-w-[200px]">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {issues.map((issue, idx) => (
                        <motion.tr
                          key={issue.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="border-b border-secondary-100 hover:bg-primary-50 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-secondary-700 text-center">
                            {issue.issueNo}
                          </td>
                          <td className="px-4 py-3 text-secondary-600 text-center">
                            {formatDate(issue.issuedAt)}
                          </td>
                          <td className="px-4 py-3 font-medium text-text text-center">
                            {issue.item?.itemName ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600 text-center">
                            {issue.company?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600 text-center">
                            {issue.contractor?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600 text-center">
                            {issue.machine?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600 text-center">
                            {issue.location?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600 text-center">
                            {issue.issuedTo ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${issue.isActive
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : "bg-red-100 text-red-700 border border-red-200"
                                }`}
                            >
                              {issue.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          {/* <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                issue.isReturned
                                  ? "bg-green-100 text-green-700 border border-green-200"
                                  : "bg-amber-100 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {issue.isReturned ? "Yes" : "No"}
                            </span>
                          </td> */}
                          {(canAddOutward || canEditOutward) && (
                            <td className="px-4 py-3 min-w-[200px]">
                              <div className="flex flex-nowrap items-center justify-center gap-1 whitespace-nowrap">
                                {!issue.isReturned && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => goToInward(issue)}
                                    className="shrink-0 text-primary-600 border-primary-200 hover:bg-primary-50 hover:border-primary-300"
                                  >
                                    <LogIn className="w-4 h-4 mr-1" />
                                    Inward
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEdit(issue)}
                                  title={
                                    issue.isReturned
                                      ? "View only (inward done)"
                                      : canEditOutward
                                        ? "Edit outward"
                                        : "View outward (edit disabled)"
                                  }
                                  className="shrink-0"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                {isAdmin && (
                                  <>
                                    {issue.isActive && !issue.isReturned && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setInactiveTarget(issue)}
                                        title="Mark outward inactive"
                                        className="shrink-0 text-amber-600 hover:bg-amber-50"
                                        disabled={setInactiveMutation.isPending}
                                      >
                                        <Ban className="w-4 h-4" />
                                      </Button>
                                    )}
                                    {!issue.isActive && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setActiveMutation.mutate(issue.id)
                                        }
                                        title="Mark outward active"
                                        className="shrink-0 text-green-600 hover:bg-green-50"
                                        disabled={setActiveMutation.isPending}
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
                      ? "No outward entries match your filters."
                      : "No outward entries yet. Create one above."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog
          isOpen={!!inactiveTarget}
          onClose={() => setInactiveTarget(null)}
          title="Mark outward inactive?"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-secondary-600">
              {inactiveTarget
                ? `"${inactiveTarget.issueNo}" — ${inactiveTarget.item?.itemName ?? "Item"} will be marked inactive. You can reactivate it later.`
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

        <Dialog
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title={
            editingIssue
              ? editingIssue.isReturned
                ? "View Outward"
                : "Edit Outward"
              : "Outward Entry"
          }
          size="3xl"
          contentScroll={false}
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0 -m-6"
            aria-label="Outward entry form"
          >
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-4">
              <div className="grid grid-cols-1 lg:grid-cols-[70%_1fr] gap-6 lg:gap-8">
                {/* Left Column: Form Fields */}
                <div className="space-y-5">
                  {(nextIssueCode || editingIssue) && (
                    <div>
                      <Label
                        htmlFor="outward-issue-no"
                        className="text-sm font-medium text-secondary-700"
                      >
                        Issue No
                      </Label>
                      <Input
                        id="outward-issue-no"
                        value={
                          editingIssue ? editingIssue.issueNo : nextIssueCode
                        }
                        disabled
                        readOnly
                        className="mt-1.5 h-10 bg-secondary-50 border-secondary-200"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {editingIssue ? (
                      <>
                        <div>
                          <Label className="text-sm font-medium text-secondary-700">
                            Item Category
                          </Label>
                          <p className="mt-1.5 h-10 px-3 py-2 rounded-md border border-secondary-200 bg-secondary-50 text-sm text-secondary-700 flex items-center">
                            {editingIssue.item?.categoryId != null
                              ? (categories.find(
                                (c) => c.id === editingIssue.item?.categoryId,
                              )?.name ?? "—")
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-secondary-700">
                            Item
                          </Label>
                          <p className="mt-1.5 h-10 px-3 py-2 rounded-md border border-secondary-200 bg-secondary-50 text-sm text-secondary-700 flex items-center">
                            {editingIssue.item?.itemName ?? "—"}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <Label
                            htmlFor="outward-category-id"
                            className="text-sm font-medium text-secondary-700"
                          >
                            Item Category{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <div className="mt-1.5">
                            <SearchableSelect
                              id="outward-category-id"
                              options={categorySelectOptions}
                              value={selectedCategoryId ?? ""}
                              onChange={(v) => {
                                const n = v ? Number(v) : 0;
                                setValue("categoryId", n);
                                setValue("itemId", 0);
                                if (n !== 0) {
                                  setIsItemDialogOpen(true);
                                }
                              }}
                              placeholder="Select category"
                              searchPlaceholder="Search categories..."
                              error={errors.categoryId?.message}
                            />
                          </div>
                        </div>
                        <div>
                          <Label
                            htmlFor="outward-item-id"
                            className="text-sm font-medium text-secondary-700"
                          >
                            Item <span className="text-red-500">*</span>
                          </Label>
                          <div className="mt-1.5">
                            <div
                              onClick={() => {
                                if (selectedCategoryId && selectedCategoryId !== 0) {
                                  setIsItemDialogOpen(true);
                                }
                              }}
                              className={cn(
                                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                !selectedCategoryId || selectedCategoryId === 0
                                  ? "cursor-not-allowed opacity-50 bg-secondary-100/50"
                                  : "cursor-pointer hover:bg-secondary-50"
                              )}
                            >
                              <span className={cn(
                                "truncate",
                                !selectedItemId && "text-muted-foreground"
                              )}>
                                {selectedItemId
                                  ? filterItems.find((i) => i.id === selectedItemId)?.itemName || "Select item"
                                  : selectedCategoryId
                                    ? "Select item"
                                    : "Select category first"}
                              </span>
                            </div>
                            {errors.itemId?.message && (
                              <p className="mt-1 text-xs text-red-500 font-medium">
                                {errors.itemId.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label
                        htmlFor="outward-company-id"
                        className="text-sm font-medium text-secondary-700"
                      >
                        Company <span className="text-red-500">*</span>
                      </Label>
                      <div className="mt-1.5">
                        <SearchableSelect
                          id="outward-company-id"
                          options={companySelectOptions}
                          value={watchedCompanyId ?? ""}
                          onChange={(v) => setValue("companyId", Number(v))}
                          disabled={isViewOnly}
                          placeholder="Select company"
                          searchPlaceholder="Search companies..."
                          error={errors.companyId?.message}
                        />
                      </div>
                    </div>
                    <div>
                      <Label
                        htmlFor="outward-contractor-id"
                        className="text-sm font-medium text-secondary-700"
                      >
                        Contractor <span className="text-red-500">*</span>
                      </Label>
                      <div className="mt-1.5">
                        <SearchableSelect
                          id="outward-contractor-id"
                          options={contractorSelectOptions}
                          value={watchedContractorId ?? ""}
                          onChange={(v) => setValue("contractorId", Number(v))}
                          disabled={isViewOnly}
                          placeholder="Select contractor"
                          searchPlaceholder="Search contractors..."
                          error={errors.contractorId?.message}
                        />
                      </div>
                    </div>
                    <div>
                      <Label
                        htmlFor="outward-machine-id"
                        className="text-sm font-medium text-secondary-700"
                      >
                        Machine <span className="text-red-500">*</span>
                      </Label>
                      <div className="mt-1.5">
                        <SearchableSelect
                          id="outward-machine-id"
                          options={machineSelectOptions}
                          value={watchedMachineId ?? ""}
                          onChange={(v) => setValue("machineId", Number(v))}
                          disabled={isViewOnly}
                          placeholder="Select machine"
                          searchPlaceholder="Search machines..."
                          error={errors.machineId?.message}
                        />
                      </div>
                    </div>
                    <div>
                      <Label
                        htmlFor="outward-location-id"
                        className="text-sm font-medium text-secondary-700"
                      >
                        Location <span className="text-red-500">*</span>
                      </Label>
                      <div className="mt-1.5">
                        <SearchableSelect
                          id="outward-location-id"
                          options={locationSelectOptions}
                          value={watchedLocationId ?? ""}
                          onChange={(v) => setValue("locationId", Number(v))}
                          disabled={isViewOnly}
                          placeholder="Select location"
                          searchPlaceholder="Search locations..."
                          error={errors.locationId?.message}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="outward-operator"
                        className="text-sm font-medium text-secondary-700"
                      >
                        Operator Name{" "}
                        <span className="text-secondary-400 font-normal">
                          (optional)
                        </span>
                      </Label>
                      <Input
                        id="outward-operator"
                        {...register("issuedTo")}
                        placeholder="Operator name"
                        disabled={isViewOnly}
                        className="mt-1.5 h-10 border-secondary-300 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="outward-remarks"
                      className="text-sm font-medium text-secondary-700"
                    >
                      Remarks{" "}
                      <span className="text-secondary-400 font-normal">
                        (optional)
                      </span>
                    </Label>
                    <Textarea
                      id="outward-remarks"
                      {...register("remarks")}
                      placeholder="Optional remarks..."
                      rows={3}
                      disabled={isViewOnly}
                      className="mt-1.5 border-secondary-300 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 resize-y disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Right Column: Item Image Preview */}
                <div className="lg:min-h-[360px]">
                  <Label className="text-sm font-medium text-secondary-700 mb-1.5 block">
                    Latest Condition Photo
                  </Label>
                  <div className="rounded-xl border border-secondary-200 bg-secondary-50/50 overflow-hidden h-full min-h-[250px] flex flex-col items-center justify-center p-4">
                    {selectedItem || (editingIssue && editingIssue.item) ? (
                      (selectedItem as any)?.latestImage ||
                        (editingIssue?.item as any)?.latestImage ? (
                        <div className="relative group cursor-pointer w-full h-full flex items-center justify-center">
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/storage/${(selectedItem as any)?.latestImage || (editingIssue?.item as any)?.latestImage}`}
                            alt="Latest condition"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-sm group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="bg-white/90 backdrop-blur-sm"
                              onClick={() => {
                                const src =
                                  (selectedItem as any)?.latestImage ||
                                  (editingIssue?.item as any)?.latestImage;
                                if (src)
                                  setFullScreenImageSrc(
                                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/storage/${src}`,
                                  );
                              }}
                            >
                              View full screen
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center space-y-2">
                          <div className="w-16 h-16 rounded-full bg-secondary-100 flex items-center justify-center mx-auto">
                            <ImageIcon className="w-8 h-8 text-secondary-400" />
                          </div>
                          <p className="text-sm text-secondary-500">
                            No image available
                          </p>
                        </div>
                      )
                    ) : (
                      <div className="text-center space-y-2">
                        <div className="w-16 h-16 rounded-full bg-secondary-100 flex items-center justify-center mx-auto">
                          <ImageIcon className="w-8 h-8 text-secondary-400" />
                        </div>
                        <p className="text-sm text-secondary-500">
                          Select an item to view its latest condition
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <p id="outward-form-hint" className="sr-only" aria-live="polite">
              Press Enter to save.
            </p>

            <div className="flex-none flex gap-3 px-6 py-4 border-t border-secondary-200 bg-secondary-50/50">
              {!isViewOnly &&
                (editingIssue ? canEditOutward : canAddOutward) && (
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending ||
                      updateMutation.isPending ||
                      !hasAllRequired
                    }
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                    aria-describedby="outward-form-hint"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving…"
                      : editingIssue
                        ? "Update"
                        : "Save"}
                  </Button>
                )}
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseForm}
                className={
                  isViewOnly ? "flex-1" : "flex-1 border-secondary-300"
                }
              >
                Close
              </Button>
            </div>
          </form>
        </Dialog>

        <FullScreenImageViewer
          isOpen={!!fullScreenImageSrc}
          imageSrc={fullScreenImageSrc}
          onClose={() => setFullScreenImageSrc(null)}
        />

        <ItemSelectionDialog
          isOpen={isItemDialogOpen}
          onClose={() => setIsItemDialogOpen(false)}
          items={filterItems}
          categories={categories}
          selectedCategoryId={selectedCategoryId ?? null}
          onSelectItem={(item) => setValue("itemId", item.id)}
        />
      </motion.div>
    </div>
  );
}
