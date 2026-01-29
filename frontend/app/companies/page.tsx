"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Company } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit2, Search, Ban, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";

const companySchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "Company name is required"),
  isActive: z.boolean().optional(),
});

type CompanyForm = z.infer<typeof companySchema>;

type ActiveFilter = "all" | "active" | "inactive";

export default function CompaniesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [inactiveTarget, setInactiveTarget] = useState<Company | null>(null);
  const [nextCompanyCode, setNextCompanyCode] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const queryClient = useQueryClient();

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await api.get("/companies");
      return res.data?.data ?? [];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
  });

  useEffect(() => {
    if (!isFormOpen) return;
    const t = setTimeout(() => {
      document.getElementById("company-name-input")?.focus();
    }, 100);
    return () => clearTimeout(t);
  }, [isFormOpen]);

  const createMutation = useMutation({
    mutationFn: async (data: {
      code?: string;
      name: string;
      isActive?: boolean;
    }) => {
      const res = await api.post("/companies", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      handleCloseForm();
      toast.success("Company created successfully");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create company.";
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CompanyForm }) => {
      const res = await api.patch(`/companies/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      handleCloseForm();
      toast.success("Company updated successfully");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update company.";
      toast.error(msg);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await api.patch(`/companies/${id}`, { isActive });
      return res.data;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setInactiveTarget(null);
      toast.success(
        isActive ? "Company marked active." : "Company marked inactive.",
      );
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update status.";
      toast.error(msg);
    },
  });

  const handleOpenForm = async (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setValue("code", company.code);
      setValue("name", company.name);
      setValue("isActive", company.isActive);
      setNextCompanyCode("");
    } else {
      setEditingCompany(null);
      reset();
      try {
        const res = await api.get("/companies/next-code");
        const next = res.data?.data?.nextCode ?? "";
        setNextCompanyCode(next);
        setValue("code", next);
      } catch {
        setNextCompanyCode("");
      }
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCompany(null);
    setNextCompanyCode("");
    reset();
    createMutation.reset();
    updateMutation.reset();
  };

  const onSubmit = (data: CompanyForm) => {
    const name = (data.name ?? "").trim();
    if (!name) {
      toast.error("Company name is required");
      return;
    }
    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany.id, data });
    } else {
      createMutation.mutate({
        code: data.code || nextCompanyCode || undefined,
        name,
        isActive: data.isActive,
      });
    }
  };

  const handleMarkInactiveConfirm = () => {
    if (!inactiveTarget) return;
    toggleActiveMutation.mutate({ id: inactiveTarget.id, isActive: false });
  };

  const handleMarkActive = (c: Company) => {
    toggleActiveMutation.mutate({ id: c.id, isActive: true });
  };

  const filteredCompanies = useMemo(() => {
    let list = companies;
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
      );
    }
    if (activeFilter === "active") list = list.filter((c) => c.isActive);
    if (activeFilter === "inactive") list = list.filter((c) => !c.isActive);
    return list;
  }, [companies, searchTerm, activeFilter]);

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
                Company Master
              </h1>
              <p className="text-secondary-600">
                Manage company master entries
              </p>
            </div>
            <Button onClick={() => handleOpenForm()} className="shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
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
              <CardTitle>All Companies ({filteredCompanies.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
                </div>
              ) : filteredCompanies.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-secondary-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-secondary-200 bg-secondary-50">
                        <th className="px-4 py-3 font-semibold text-text">
                          Code
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Name
                        </th>
                        <th className="px-4 py-3 font-semibold text-text">
                          Status
                        </th>
                        <th className="px-4 py-3 font-semibold text-text text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompanies.map((company, idx) => (
                        <motion.tr
                          key={company.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="border-b border-secondary-100 hover:bg-secondary-50/50"
                        >
                          <td className="px-4 py-3 font-mono text-secondary-700">
                            {company.code}
                          </td>
                          <td className="px-4 py-3 font-medium text-text">
                            {company.name}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                company.isActive
                                  ? "bg-green-100 text-green-700 border border-green-200"
                                  : "bg-red-100 text-red-700 border border-red-200"
                              }`}
                            >
                              {company.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenForm(company)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              {company.isActive ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setInactiveTarget(company)}
                                  className="text-amber-600 hover:bg-amber-50"
                                  disabled={toggleActiveMutation.isPending}
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkActive(company)}
                                  className="text-green-600 hover:bg-green-50"
                                  disabled={toggleActiveMutation.isPending}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
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
                      ? "No companies match your filters."
                      : "No companies yet. Add your first company above."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog
          isOpen={!!inactiveTarget}
          onClose={() => setInactiveTarget(null)}
          title="Mark company inactive?"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-secondary-600">
              {inactiveTarget
                ? `"${inactiveTarget.name}" (${inactiveTarget.code}) will be marked inactive. You can reactivate it later.`
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
          title={
            editingCompany ? "Update Company Master" : "Add New Company Master"
          }
          size="lg"
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            aria-label={editingCompany ? "Update company" : "Add new company"}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company-code">Company Code</Label>
                <Input
                  id="company-code"
                  placeholder="COM-001"
                  disabled
                  readOnly
                  value={editingCompany ? editingCompany.code : nextCompanyCode}
                  className="mt-1 bg-secondary-50"
                />
              </div>
              <div>
                <Label htmlFor="company-name-input">
                  Company Master Name *
                </Label>
                <Input
                  id="company-name-input"
                  {...register("name")}
                  placeholder="Acme Corp"
                  className="mt-1"
                  aria-required="true"
                  aria-invalid={!!errors.name}
                  aria-describedby={
                    errors.name ? "company-name-error" : "company-form-hint"
                  }
                />
                {errors.name && (
                  <p
                    id="company-name-error"
                    className="text-sm text-red-600 mt-1"
                    role="alert"
                  >
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>
            {editingCompany && (
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
                    aria-describedby="company-form-hint"
                  />
                  <span>Active</span>
                </Label>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1"
                aria-describedby="company-form-hint"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving…"
                  : editingCompany
                    ? "Update Company Master"
                    : "Create Company Master"}
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
