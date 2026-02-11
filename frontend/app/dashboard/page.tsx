"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { DashboardMetrics, Item, ItemCategory } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package,
  CheckCircle,
  AlertCircle,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Search,
  Download,
  ZoomIn,
} from "lucide-react";
import Link from "next/link";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { FullScreenImageViewer } from "@/components/ui/full-screen-image-viewer";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type TableView = "available" | "total" | "missing" | null;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tableView, setTableView] = useState<TableView>(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const { data: permissions } = useCurrentUserPermissions();

  // Full screen image viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search, 400);

  const openImageViewer = (imagePath: string) => {
    setSelectedImage(`${API_BASE_URL}/storage/${imagePath}`);
    setViewerOpen(true);
  };

  useEffect(() => {
    // First check localStorage for optimistic loading
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setLoading(false);
      } catch {
        router.push("/login");
        return;
      }
    }

    // Validate in background
    api
      .post("/auth/validate")
      .then(() => {
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("user");
        router.push("/login");
      });
  }, [router]);

  const { data: metrics } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const response = await api.get("/dashboard/metrics");
      return response.data.data;
    },
  });

  const tableParams = useMemo(
    () => ({
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(categoryId !== "" &&
        typeof categoryId === "number" && { categoryIds: String(categoryId) }),
    }),
    [debouncedSearch, categoryId],
  );

  const { data: availableItems, isLoading: loadingAvailable } = useQuery<
    Item[]
  >({
    queryKey: ["dashboard", "available-items", tableParams],
    queryFn: async () => {
      const response = await api.get("/dashboard/available-items", {
        params: tableParams,
      });
      return response.data?.data || [];
    },
    enabled: tableView === "available",
  });

  const { data: totalItems, isLoading: loadingTotal } = useQuery<Item[]>({
    queryKey: ["dashboard", "total-items", tableParams],
    queryFn: async () => {
      const response = await api.get("/dashboard/total-items", {
        params: tableParams,
      });
      return response.data?.data || [];
    },
    enabled: tableView === "total",
  });

  const { data: missingItems, isLoading: loadingMissing } = useQuery<Item[]>({
    queryKey: ["dashboard", "missing-items", tableParams],
    queryFn: async () => {
      const response = await api.get("/dashboard/missing-items", {
        params: tableParams,
      });
      return response.data?.data || [];
    },
    enabled: tableView === "missing",
  });

  const { data: categories = [] } = useQuery<ItemCategory[]>({
    queryKey: ["item-categories", "active"],
    queryFn: async () => {
      const response = await api.get("/item-categories/active");
      return response.data?.data || [];
    },
    enabled:
      tableView === "available" ||
      tableView === "total" ||
      tableView === "missing",
  });

  const categoryMap = (categories || []).reduce<Record<number, string>>(
    (acc, c) => {
      acc[c.id] = c.name;
      return acc;
    },
    {},
  );

  const tableData =
    tableView === "available"
      ? availableItems || []
      : tableView === "missing"
        ? missingItems || []
        : totalItems || [];
  const tableLoading =
    tableView === "available"
      ? loadingAvailable
      : tableView === "missing"
        ? loadingMissing
        : loadingTotal;

  const handleExportExcel = async () => {
    if (!tableView) return;
    try {
      const endpoint =
        tableView === "available"
          ? "/dashboard/export/available-items"
          : tableView === "missing"
            ? "/dashboard/export/missing-items"
            : "/dashboard/export/total-items";
      const response = await api.get(endpoint, {
        responseType: "blob",
        params: tableParams,
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const filename =
        tableView === "available"
          ? `dashboard-available-items-${new Date().toISOString().split("T")[0]}.xlsx`
          : tableView === "missing"
            ? `dashboard-missing-items-${new Date().toISOString().split("T")[0]}.xlsx`
            : `dashboard-total-items-${new Date().toISOString().split("T")[0]}.xlsx`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export. Please try again.");
    }
  };

  // Permission Guard - Redirect if can't view dashboard
  useEffect(() => {
    if (permissions && !permissions.viewDashboard) {
      // Find first available path
      let fallbackPath = "/items";
      if (permissions.viewMaster) {
        if (permissions.viewCompanyMaster) fallbackPath = "/companies";
        else if (permissions.viewLocationMaster) fallbackPath = "/locations";
        else if (permissions.viewContractorMaster) fallbackPath = "/contractors";
        else if (permissions.viewMachineMaster) fallbackPath = "/machines";
        else if (permissions.viewItemCategoryMaster) fallbackPath = "/item-categories";
        else if (permissions.viewItemMaster) fallbackPath = "/items";
        else if (permissions.viewStatusMaster) fallbackPath = "/statuses";
      } else if (permissions.viewOutward) fallbackPath = "/issues";
      else if (permissions.viewInward) fallbackPath = "/returns";
      else if (permissions.viewReports) fallbackPath = "/reports";
      else if (permissions.accessSettings) fallbackPath = "/settings";

      router.push(fallbackPath);
    }
  }, [permissions, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleCardClick = (title: string) => {
    if (title === "Total Items") setTableView("total");
    else if (title === "Available") setTableView("available");
    else if (title === "Missing") router.push("/reports?section=missing");
    else if (title === "Active Issues")
      router.push("/reports?section=active-issues");
  };

  const statCards = [
    {
      title: "Total Items",
      value: metrics?.items.total || 0,
      icon: Package,
      gradient: "from-blue-500 to-blue-600",
      baseBg: "bg-blue-50/40",
      shadowColor: "shadow-blue-500/20",
      iconColor: "text-blue-600",
      iconBg: "bg-white",
      trend: null,
      onClick: () => handleCardClick("Total Items"),
      show: true,
    },
    {
      title: "Available",
      value: metrics?.items.available || 0,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-emerald-600",
      baseBg: "bg-emerald-50/40",
      shadowColor: "shadow-emerald-500/20",
      iconColor: "text-emerald-600",
      iconBg: "bg-white",
      trend: "up",
      onClick: () => handleCardClick("Available"),
      show: true,
    },
    {
      title: "Missing",
      value: metrics?.items.missing || 0,
      icon: AlertCircle,
      gradient: "from-rose-500 to-rose-600",
      baseBg: "bg-rose-50/40",
      shadowColor: "shadow-rose-500/20",
      iconColor: "text-rose-600",
      iconBg: "bg-white",
      trend: "down",
      onClick: () => handleCardClick("Missing"),
      show: permissions?.viewMissingItemsReport,
    },
    {
      title: "Active Issues",
      value: metrics?.issues.active || 0,
      icon: ClipboardList,
      gradient: "from-amber-500 to-amber-600",
      baseBg: "bg-amber-50/40",
      shadowColor: "shadow-amber-500/20",
      iconColor: "text-amber-600",
      iconBg: "bg-white",
      trend: null,
      onClick: () => handleCardClick("Active Issues"),
      show: permissions?.viewActiveIssuesReport,
    },
  ].filter(card => card.show !== false);

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Dashboard</h1>
            <p className="text-secondary-600">
              Plan, prioritize, and manage your QC items with ease.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {permissions?.viewReports && (
              <Link href="/reports">
                <Button className="shadow-md">
                  View Reports
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="h-full"
              >
                <div
                  onClick={stat.onClick}
                  className={`
                    relative overflow-hidden rounded-2xl cursor-pointer group h-full
                    ${stat.baseBg} hover:bg-gradient-to-br ${stat.gradient}
                    transition-all duration-500 ease-out
                    shadow-xl ${stat.shadowColor} border border-secondary-100/50
                  `}
                >
                  <CardContent className="p-6 relative z-10">
                    <div className="flex justify-between items-start">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-secondary-500 group-hover:text-white/90 transition-colors duration-300">
                            {stat.title}
                          </p>
                          <h3 className="text-4xl font-bold text-text group-hover:text-white transition-colors duration-300 tracking-tight">
                            {stat.value}
                          </h3>
                        </div>
                        {/* 
                        {stat.trend && (
                          <div className={`
                            flex items-center space-x-1 text-sm font-medium
                            ${stat.trend === 'up' ? 'text-green-600' : 'text-rose-600'}
                            group-hover:text-white/90 transition-colors duration-300
                          `}>
                            {stat.trend === 'up' ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            <span>{stat.trend === 'up' ? '+12.5%' : '-2.4%'}</span>
                          </div>
                        )} */}
                      </div>

                      <div
                        className={`
                        p-3 rounded-xl shadow-sm transition-all duration-300
                        bg-secondary-50 group-hover:bg-white/20 group-hover:backdrop-blur-sm
                        group-hover:scale-110 group-hover:rotate-3
                      `}
                      >
                        <Icon
                          className={`
                          w-6 h-6 transition-colors duration-300
                          ${stat.iconColor} group-hover:text-white
                        `}
                        />
                      </div>
                    </div>

                    {/* Decorative background shapes */}
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-current opacity-[0.03] group-hover:opacity-10 pointer-events-none transition-opacity duration-500" />
                  </CardContent>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Items table (shown when Available, Total, or Missing is clicked) */}
        {(tableView === "available" ||
          tableView === "total" ||
          tableView === "missing") && (
            <Card className="shadow-lg border-0">
              <CardHeader className="border-b border-secondary-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="text-xl font-bold text-text">
                    {tableView === "available"
                      ? "Available Items"
                      : tableView === "missing"
                        ? "Missing Items"
                        : "Total Items (Available & Missing)"}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[180px] max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400 pointer-events-none" />
                      <Input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, serial, description…"
                        className="pl-9 h-10 rounded-lg border-secondary-300 bg-white"
                      />
                    </div>
                    <div className="min-w-[140px]">
                      <Label htmlFor="dashboard-category" className="sr-only">
                        Category
                      </Label>
                      <select
                        id="dashboard-category"
                        value={categoryId === "" ? "" : categoryId}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCategoryId(v === "" ? "" : Number(v));
                        }}
                        className="flex h-10 w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm text-text"
                      >
                        <option value="">All categories</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      onClick={handleExportExcel}
                      disabled={tableLoading}
                      className="shadow-sm"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {tableLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                    <p className="mt-4 text-secondary-600">Loading...</p>
                  </div>
                ) : tableData.length > 0 ? (
                  <div className="overflow-x-auto overflow-y-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-primary-200 bg-primary-100">
                          <th className="text-left py-3 px-4 font-semibold text-sm text-primary-900 w-16">
                            Sr.No
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                            Item Name
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                            Item Category
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                            Serial Number
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                            In-House Location
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700 w-[60px]">
                            Image
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((item, index) => (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="border-b border-secondary-100 hover:bg-primary-50 transition-colors"
                          >
                            <td className="py-3 px-4 text-secondary-600">
                              {index + 1}
                            </td>
                            <td className="py-3 px-4 font-medium text-text">
                              {item.itemName}
                            </td>
                            <td className="py-3 px-4 text-sm text-secondary-600">
                              {item.categoryId != null
                                ? (categoryMap[item.categoryId] ?? "—")
                                : "—"}
                            </td>
                            <td className="py-3 px-4 text-sm text-secondary-600 font-mono">
                              {item.serialNumber ?? "—"}
                            </td>
                            <td className="py-3 px-4 text-sm text-secondary-600">
                              {item.inHouseLocation ?? "—"}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === "AVAILABLE"
                                  ? "bg-green-100 text-green-700 border border-green-200"
                                  : item.status === "MISSING"
                                    ? "bg-red-100 text-red-700 border border-red-200"
                                    : "bg-secondary-100 text-secondary-700 border border-secondary-200"
                                  }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {item.image ? (
                                <button
                                  type="button"
                                  onClick={() => openImageViewer(item.image!)}
                                  className="group/img relative block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                                >
                                  <img
                                    src={`${API_BASE_URL}/storage/${item.image}`}
                                    alt=""
                                    width={30}
                                    height={30}
                                    className="min-w-[30px] min-h-[30px] w-[30px] h-[30px] object-cover rounded border border-secondary-200 transition-transform group-hover/img:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity rounded flex items-center justify-center">
                                    <ZoomIn className="w-3 h-3 text-white" />
                                  </div>
                                </button>
                              ) : (
                                <span className="inline-block min-w-[30px] min-h-[30px] w-[30px] h-[30px] rounded border border-secondary-200 bg-secondary-100 text-secondary-400 text-xs flex items-center justify-center">
                                  —
                                </span>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-secondary-500">
                      {tableView === "available"
                        ? "No available items match your filters."
                        : tableView === "missing"
                          ? "No missing items match your filters."
                          : "No items match your filters."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
      </motion.div>

      <FullScreenImageViewer
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        imageSrc={selectedImage}
      />
    </div>
  );
}
