"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Location } from "@/types";
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

const locationSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "Location name is required"),
  isActive: z.boolean().optional(),
});

type LocationForm = z.infer<typeof locationSchema>;

type ActiveFilter = "all" | "active" | "inactive";

export default function LocationsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [inactiveTarget, setInactiveTarget] = useState<Location | null>(null);
  const [nextLocationCode, setNextLocationCode] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const queryClient = useQueryClient();

  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await api.get("/locations");
      return res.data?.data ?? [];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
  });

  useEffect(() => {
    if (!isFormOpen) return;
    const t = setTimeout(() => {
      document.getElementById("location-name-input")?.focus();
    }, 100);
    return () => clearTimeout(t);
  }, [isFormOpen]);

  const createMutation = useMutation({
    mutationFn: async (data: {
      code?: string;
      name: string;
      isActive?: boolean;
    }) => {
      const res = await api.post("/locations", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      handleCloseForm();
      toast.success("Location created successfully");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create location.";
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: LocationForm }) => {
      const res = await api.patch(`/locations/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      handleCloseForm();
      toast.success("Location updated successfully");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update location.";
      toast.error(msg);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await api.patch(`/locations/${id}`, { isActive });
      return res.data;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setInactiveTarget(null);
      toast.success(
        isActive ? "Location marked active." : "Location marked inactive.",
      );
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update status.";
      toast.error(msg);
    },
  });

  const handleOpenForm = async (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setValue("code", location.code);
      setValue("name", location.name);
      setValue("isActive", location.isActive);
      setNextLocationCode("");
    } else {
      setEditingLocation(null);
      reset();
      try {
        const res = await api.get("/locations/next-code");
        const next = res.data?.data?.nextCode ?? "";
        setNextLocationCode(next);
        setValue("code", next);
      } catch {
        setNextLocationCode("");
      }
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingLocation(null);
    setNextLocationCode("");
    reset();
    createMutation.reset();
    updateMutation.reset();
  };

  const onSubmit = (data: LocationForm) => {
    const name = (data.name ?? "").trim();
    if (!name) {
      toast.error("Location name is required");
      return;
    }
    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, data });
    } else {
      createMutation.mutate({
        code: data.code || nextLocationCode || undefined,
        name,
        isActive: data.isActive,
      });
    }
  };

  const handleMarkInactiveConfirm = () => {
    if (!inactiveTarget) return;
    toggleActiveMutation.mutate({ id: inactiveTarget.id, isActive: false });
  };

  const handleMarkActive = (loc: Location) => {
    toggleActiveMutation.mutate({ id: loc.id, isActive: true });
  };

  const filteredLocations = useMemo(() => {
    let list = locations;
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (loc) =>
          loc.name.toLowerCase().includes(q) ||
          loc.code.toLowerCase().includes(q),
      );
    }
    if (activeFilter === "active") list = list.filter((loc) => loc.isActive);
    if (activeFilter === "inactive") list = list.filter((loc) => !loc.isActive);
    return list;
  }, [locations, searchTerm, activeFilter]);

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
                Location Master
              </h1>
              <p className="text-secondary-600">
                Manage location master entries
              </p>
            </div>
            <Button onClick={() => handleOpenForm()} className="shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Add Location
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
              <CardTitle>All Locations ({filteredLocations.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
                </div>
              ) : filteredLocations.length > 0 ? (
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
                      {filteredLocations.map((loc, idx) => (
                        <motion.tr
                          key={loc.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="border-b border-secondary-100 hover:bg-secondary-50/50"
                        >
                          <td className="px-4 py-3 font-mono text-secondary-700">
                            {loc.code}
                          </td>
                          <td className="px-4 py-3 font-medium text-text">
                            {loc.name}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                loc.isActive
                                  ? "bg-green-100 text-green-700 border border-green-200"
                                  : "bg-red-100 text-red-700 border border-red-200"
                              }`}
                            >
                              {loc.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenForm(loc)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              {loc.isActive ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setInactiveTarget(loc)}
                                  className="text-amber-600 hover:bg-amber-50"
                                  disabled={toggleActiveMutation.isPending}
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkActive(loc)}
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
                      ? "No locations match your filters."
                      : "No locations yet. Add your first location above."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog
          isOpen={!!inactiveTarget}
          onClose={() => setInactiveTarget(null)}
          title="Mark location inactive?"
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
            editingLocation
              ? "Update Location Master"
              : "Add New Location Master"
          }
          size="lg"
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            aria-label={
              editingLocation ? "Update location" : "Add new location"
            }
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location-code">Location Master Code</Label>
                <Input
                  id="location-code"
                  placeholder="LOC-001"
                  disabled
                  readOnly
                  value={
                    editingLocation ? editingLocation.code : nextLocationCode
                  }
                  className="mt-1 bg-secondary-50"
                />
              </div>
              <div>
                <Label htmlFor="location-name-input">
                  Location Master Name *
                </Label>
                <Input
                  id="location-name-input"
                  {...register("name")}
                  placeholder="e.g. Warehouse A"
                  className="mt-1"
                  aria-required="true"
                  aria-invalid={!!errors.name}
                  aria-describedby={
                    errors.name ? "location-name-error" : "location-form-hint"
                  }
                />
                {errors.name && (
                  <p
                    id="location-name-error"
                    className="text-sm text-red-600 mt-1"
                    role="alert"
                  >
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>
            {editingLocation && (
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
                    aria-describedby="location-form-hint"
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
                aria-describedby="location-form-hint"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving…"
                  : editingLocation
                    ? "Update Location"
                    : "Create Location"}
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
