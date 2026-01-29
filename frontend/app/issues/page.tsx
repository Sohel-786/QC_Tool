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
import { Plus, ArrowRight } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "react-hot-toast";

const issueSchema = z.object({
  categoryId: z.number().min(1, "Item category is required"),
  itemId: z.number().min(1, "Item is required"),
  companyId: z.number().optional(),
  contractorId: z.number().optional(),
  machineId: z.number().optional(),
  issuedTo: z.string().optional(),
  remarks: z.string().optional(),
});

type IssueForm = z.infer<typeof issueSchema>;

export default function IssuesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [nextIssueCode, setNextIssueCode] = useState<string>("");
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user: currentUser } = useCurrentUser();
  const isManager = currentUser?.role === Role.QC_MANAGER;

  const { data: issues = [] } = useQuery<Issue[]>({
    queryKey: ["issues"],
    queryFn: async () => {
      const res = await api.get("/issues");
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

  const createMutation = useMutation({
    mutationFn: async (data: IssueForm) => {
      const res = await api.post("/issues", {
        ...data,
        categoryId: data.categoryId,
        itemId: data.itemId,
        companyId: data.companyId || undefined,
        contractorId: data.contractorId || undefined,
        machineId: data.machineId || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
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

  useEffect(() => {
    if (!isFormOpen) return;
    const t = setTimeout(() => {
      document.getElementById("outward-category-id")?.focus();
    }, 100);
    return () => clearTimeout(t);
  }, [isFormOpen]);

  const handleOpenForm = async () => {
    reset();
    try {
      const res = await api.get("/issues/next-code");
      setNextIssueCode(res.data?.data?.nextCode ?? "");
    } catch {
      setNextIssueCode("");
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    reset();
    setNextIssueCode("");
    createMutation.reset();
  };

  const onSubmit = (data: IssueForm) => {
    createMutation.mutate({
      ...data,
      categoryId: Number(data.categoryId),
      itemId: Number(data.itemId),
    });
  };

  const itemSelectOptions = useMemo(() => {
    return itemsByCategory.map((item) => ({
      value: item.id,
      label: `${item.itemName} (${item.itemCode})${item.status !== ItemStatus.AVAILABLE ? ` — ${item.status}` : ""}`,
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
            {!isManager && (
              <Button onClick={handleOpenForm} className="shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Outward Entry
              </Button>
            )}
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Outward Entries ({issues.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {issues.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-secondary-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-secondary-200 bg-secondary-50">
                        <th className="px-4 py-3 font-semibold text-text">
                          Issue No
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Outward Date
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Item
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Company
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Contractor
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Machine
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Operator
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Inward Done
                        </th>
                        {!isManager && (
                          <th className="px-4 py-3 font-semibold text-text text-right">
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
                          className="border-b border-secondary-100 hover:bg-secondary-50/50"
                        >
                          <td className="px-4 py-3 font-mono text-secondary-700">
                            {issue.issueNo}
                          </td>
                          <td className="px-4 py-3 text-secondary-600">
                            {formatDate(issue.issuedAt)}
                          </td>
                          <td className="px-4 py-3 font-medium text-text">
                            {issue.item?.itemName ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600">
                            {issue.company?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600">
                            {issue.contractor?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600">
                            {issue.machine?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-secondary-600">
                            {issue.issuedTo ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                issue.isReturned
                                  ? "bg-green-100 text-green-700 border border-green-200"
                                  : "bg-amber-100 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {issue.isReturned ? "Yes" : "No"}
                            </span>
                          </td>
                          {!isManager && (
                            <td className="px-4 py-3 text-right">
                              {!issue.isReturned && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => goToInward(issue)}
                                  className="text-primary-600 hover:bg-primary-50"
                                >
                                  <ArrowRight className="w-4 h-4 mr-1" />
                                  Go to Inward
                                </Button>
                              )}
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
                    No outward entries yet. Create one above.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title="Outward Entry"
          size="2xl"
          contentScroll={false}
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0 -m-6"
            aria-label="Outward entry form"
          >
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-4">
              <div className="space-y-5">
                {nextIssueCode && (
                  <div>
                    <Label
                      htmlFor="outward-issue-no"
                      className="text-sm font-medium text-secondary-700"
                    >
                      Issue No
                    </Label>
                    <Input
                      id="outward-issue-no"
                      value={nextIssueCode}
                      disabled
                      readOnly
                      className="mt-1.5 h-10 bg-secondary-50 border-secondary-200"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="outward-category-id"
                      className="text-sm font-medium text-secondary-700"
                    >
                      Item Category <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="outward-category-id"
                      value={selectedCategoryId ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        const n = v ? Number(v) : 0;
                        setValue("categoryId", n);
                        setValue("itemId", 0 as any);
                      }}
                      className="mt-1.5 flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                      aria-required="true"
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {errors.categoryId && (
                      <p className="text-sm text-red-600 mt-1" role="alert">
                        {errors.categoryId.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label
                      htmlFor="outward-item-id"
                      className="text-sm font-medium text-secondary-700"
                    >
                      Item <span className="text-red-500">*</span>
                    </Label>
                    <div className="mt-1.5">
                      <SearchableSelect
                        id="outward-item-id"
                        options={itemSelectOptions}
                        value={selectedItemId ?? ""}
                        onChange={(v) => setValue("itemId", Number(v))}
                        placeholder={
                          selectedCategoryId
                            ? "Select item"
                            : "Select category first"
                        }
                        disabled={
                          !selectedCategoryId || selectedCategoryId === 0
                        }
                        searchPlaceholder="Search items..."
                        error={errors.itemId?.message}
                      />
                    </div>
                    {/* {selectedCategoryId && itemsLoading && (
                      <p className="text-xs text-secondary-500 mt-1">
                        Loading items…
                      </p>
                    )} */}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label
                      htmlFor="outward-company-id"
                      className="text-sm font-medium text-secondary-700"
                    >
                      Company{" "}
                      <span className="text-secondary-400 font-normal">
                        (optional)
                      </span>
                    </Label>
                    <select
                      id="outward-company-id"
                      {...register("companyId", {
                        setValueAs: (v) =>
                          v === "" || v == null ? undefined : Number(v),
                      })}
                      className="mt-1.5 flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                    >
                      <option value="">Select company</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label
                      htmlFor="outward-contractor-id"
                      className="text-sm font-medium text-secondary-700"
                    >
                      Contractor{" "}
                      <span className="text-secondary-400 font-normal">
                        (optional)
                      </span>
                    </Label>
                    <select
                      id="outward-contractor-id"
                      {...register("contractorId", {
                        setValueAs: (v) =>
                          v === "" || v == null ? undefined : Number(v),
                      })}
                      className="mt-1.5 flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                    >
                      <option value="">Select contractor</option>
                      {contractors.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label
                      htmlFor="outward-machine-id"
                      className="text-sm font-medium text-secondary-700"
                    >
                      Machine{" "}
                      <span className="text-secondary-400 font-normal">
                        (optional)
                      </span>
                    </Label>
                    <select
                      id="outward-machine-id"
                      {...register("machineId", {
                        setValueAs: (v) =>
                          v === "" || v == null ? undefined : Number(v),
                      })}
                      className="mt-1.5 flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                    >
                      <option value="">Select machine</option>
                      {machines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
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
                      className="mt-1.5 h-10 border-secondary-300 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
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
                    className="mt-1.5 border-secondary-300 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 resize-y"
                  />
                </div>
              </div>
            </div>

            <p id="outward-form-hint" className="sr-only" aria-live="polite">
              Press Enter to save.
            </p>

            <div className="flex-none flex gap-3 px-6 py-4 border-t border-secondary-200 bg-secondary-50/50">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                aria-describedby="outward-form-hint"
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
