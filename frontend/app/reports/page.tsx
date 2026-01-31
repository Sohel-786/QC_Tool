"use client";

import { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { Issue, Item, ItemCategory } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/utils";
import {
  Search,
  Download,
  FileText,
  AlertTriangle,
  History,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  TransactionFilters,
  defaultFilters,
  type TransactionFiltersState,
} from "@/components/filters/transaction-filters";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import type { MultiSelectSearchOption } from "@/components/ui/multi-select-search";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { buildFilterParams, hasActiveFilters } from "@/lib/filters";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

type ReportType = "issued" | "missing" | "history";

const ROW_COUNT_OPTIONS = [25, 50, 75, 100] as const;
type RowCount = (typeof ROW_COUNT_OPTIONS)[number];

interface IssuedReportResponse {
  data: Issue[];
  total: number;
  page: number;
  limit: number;
}

interface MissingReportResponse {
  data: Item[];
  total: number;
  page: number;
  limit: number;
}

interface LedgerRow {
  type: "issue" | "return";
  date: string;
  issueNo: string;
  description: string;
  company?: string | null;
  contractor?: string | null;
  machine?: string | null;
  location?: string | null;
  user?: string;
  remarks?: string | null;
  returnCode?: string | null;
  condition?: string | null;
}

interface LedgerItemPayload {
  item?: Item & { category?: ItemCategory | null };
  rows?: LedgerRow[];
  total?: number;
}


function ReportsContent() {
  const searchParams = useSearchParams();
  const [activeReport, setActiveReport] = useState<ReportType>("issued");
  const [page, setPage] = useState(1);
  const [rowCount, setRowCount] = useState<RowCount>(25);
  const [filters, setFilters] = useState<TransactionFiltersState>(defaultFilters);
  const [missingFilters, setMissingFilters] =
    useState<TransactionFiltersState>(defaultFilters);
  const [ledgerFilters, setLedgerFilters] =
    useState<TransactionFiltersState>(defaultFilters);
  const [ledgerDateFrom, setLedgerDateFrom] = useState("");
  const [ledgerDateTo, setLedgerDateTo] = useState("");
  const [ledgerCategoryId, setLedgerCategoryId] = useState<number | null>(null);
  const [ledgerSelectedItemId, setLedgerSelectedItemId] = useState<number | null>(null);

  const debouncedSearch = useDebouncedValue(filters.search, 400);
  const debouncedMissingSearch = useDebouncedValue(missingFilters.search, 400);
  const debouncedLedgerSearch = useDebouncedValue(ledgerFilters.search, 400);
  const filtersForApi = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );
  const missingFiltersForApi = useMemo(
    () => ({ ...missingFilters, search: debouncedMissingSearch }),
    [missingFilters, debouncedMissingSearch]
  );
  const ledgerFiltersForApi = useMemo(
    () => ({ ...ledgerFilters, search: debouncedLedgerSearch }),
    [ledgerFilters, debouncedLedgerSearch]
  );
  const filterKey = useMemo(() => JSON.stringify(filtersForApi), [filtersForApi]);
  const missingFilterKey = useMemo(
    () => JSON.stringify(missingFiltersForApi),
    [missingFiltersForApi]
  );
  const ledgerFilterKey = useMemo(
    () =>
      JSON.stringify({
        ...ledgerFiltersForApi,
        dateFrom: ledgerDateFrom,
        dateTo: ledgerDateTo,
      }),
    [ledgerFiltersForApi, ledgerDateFrom, ledgerDateTo]
  );

  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "missing") setActiveReport("missing");
    else if (section === "active-issues" || section === "issued")
      setActiveReport("issued");
    else if (section === "history" || section === "ledger")
      setActiveReport("history");
  }, [searchParams]);

  const resetPagination = useCallback(() => {
    setPage(1);
  }, []);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies", "active"],
    queryFn: async () => {
      const res = await api.get("/companies/active");
      return res.data?.data ?? [];
    },
  });
  const { data: contractors = [] } = useQuery({
    queryKey: ["contractors", "active"],
    queryFn: async () => {
      const res = await api.get("/contractors/active");
      return res.data?.data ?? [];
    },
  });
  const { data: machines = [] } = useQuery({
    queryKey: ["machines", "active"],
    queryFn: async () => {
      const res = await api.get("/machines/active");
      return res.data?.data ?? [];
    },
  });
  const { data: locations = [] } = useQuery({
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
  const { data: categories = [] } = useQuery<ItemCategory[]>({
    queryKey: ["item-categories", "active"],
    queryFn: async () => {
      const res = await api.get("/item-categories/active");
      return res.data?.data ?? [];
    },
  });
  const ledgerItemId = ledgerSelectedItemId;

  const issuedParams = useMemo(
    () => ({
      ...buildFilterParams(filtersForApi),
      page: String(page),
      limit: String(rowCount),
    }),
    [filtersForApi, page, rowCount]
  );
  const { data: issuedReport, isLoading: loadingIssued } = useQuery<IssuedReportResponse>({
    queryKey: ["reports", "issued", filterKey, page, rowCount],
    queryFn: async () => {
      const res = await api.get("/reports/issued-items", { params: issuedParams });
      return res.data;
    },
  });

  const missingParams = useMemo(
    () => ({
      ...buildFilterParams(missingFiltersForApi),
      page: String(page),
      limit: String(rowCount),
    }),
    [missingFiltersForApi, page, rowCount]
  );
  const { data: missingReport, isLoading: loadingMissing } =
    useQuery<MissingReportResponse>({
      queryKey: ["reports", "missing", missingFilterKey, page, rowCount],
      queryFn: async () => {
        const res = await api.get("/reports/missing-items", {
          params: missingParams,
        });
        return res.data;
      },
    });

  const ledgerParams = useMemo(
    () => ({
      ...buildFilterParams(ledgerFiltersForApi),
      page: String(page),
      limit: String(rowCount),
      ...(ledgerDateFrom && { dateFrom: ledgerDateFrom }),
      ...(ledgerDateTo && { dateTo: ledgerDateTo }),
    }),
    [ledgerFiltersForApi, page, rowCount, ledgerDateFrom, ledgerDateTo]
  );
  const { data: ledgerReport, isLoading: loadingLedger } = useQuery({
    queryKey: ["reports", "ledger", ledgerItemId, ledgerFilterKey, page, rowCount],
    queryFn: async () => {
      const res = await api.get(`/reports/item-history/${ledgerItemId}`, {
        params: ledgerParams,
      });
      return res.data;
    },
    enabled: ledgerItemId != null && ledgerItemId > 0,
  });

  const handleExportExcel = useCallback(
    async (type: ReportType) => {
      try {
        let endpoint = "";
        let params: Record<string, string> = {};
        switch (type) {
          case "issued":
            params = { ...buildFilterParams(filtersForApi) };
            endpoint = "/reports/export/issued-items";
            break;
          case "missing":
            params = { ...buildFilterParams(missingFiltersForApi) };
            endpoint = "/reports/export/missing-items";
            break;
          case "history":
            endpoint = "/reports/export/item-history";
            if (ledgerItemId != null && ledgerItemId > 0) {
              params.itemId = String(ledgerItemId);
              Object.assign(params, buildFilterParams(ledgerFiltersForApi));
              if (ledgerDateFrom) params.dateFrom = ledgerDateFrom;
              if (ledgerDateTo) params.dateTo = ledgerDateTo;
            }
            break;
        }
        const response = await api.get(endpoint, {
          responseType: "blob",
          params,
        });
        const blob = new Blob([response.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        const filename =
          type === "issued"
            ? `active-issues-report-${new Date().toISOString().split("T")[0]}.xlsx`
            : type === "missing"
              ? `missing-items-report-${new Date().toISOString().split("T")[0]}.xlsx`
              : `ledger-report-${new Date().toISOString().split("T")[0]}.xlsx`;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      } catch (error) {
        console.error("Export failed:", error);
        alert("Failed to export report. Please try again.");
      }
    },
    [filtersForApi, missingFiltersForApi, ledgerItemId, ledgerFiltersForApi, ledgerDateFrom, ledgerDateTo]
  );

  const companyOptions: MultiSelectSearchOption[] = useMemo(
    () => companies.map((c: { id: number; name: string }) => ({ value: c.id, label: c.name })),
    [companies]
  );
  const contractorOptions: MultiSelectSearchOption[] = useMemo(
    () =>
      contractors.map((c: { id: number; name: string }) => ({ value: c.id, label: c.name })),
    [contractors]
  );
  const machineOptions: MultiSelectSearchOption[] = useMemo(
    () =>
      machines.map((m: { id: number; name: string }) => ({ value: m.id, label: m.name })),
    [machines]
  );
  const locationOptions: MultiSelectSearchOption[] = useMemo(
    () =>
      locations.map((l: { id: number; name: string }) => ({ value: l.id, label: l.name })),
    [locations]
  );
  const itemOptions: MultiSelectSearchOption[] = useMemo(
    () =>
      filterItems.map((i: { id: number; itemName: string; serialNumber?: string | null }) => ({
        value: i.id,
        label: i.serialNumber ? `${i.itemName} (${i.serialNumber})` : i.itemName,
      })),
    [filterItems]
  );
  const categoryOptions: MultiSelectSearchOption[] = useMemo(
    () =>
      categories.map((c: { id: number; name: string }) => ({ value: c.id, label: c.name })),
    [categories]
  );
  const ledgerItemsByCategory = useMemo(() => {
    if (ledgerCategoryId == null) return filterItems;
    return filterItems.filter(
      (i: { categoryId?: number | null }) => i.categoryId === ledgerCategoryId
    );
  }, [filterItems, ledgerCategoryId]);
  const ledgerItemOptions: MultiSelectSearchOption[] = useMemo(
    () =>
      ledgerItemsByCategory.map(
        (i: { id: number; itemName: string; serialNumber?: string | null }) => ({
          value: i.id,
          label: i.serialNumber ? `${i.itemName} (${i.serialNumber})` : i.itemName,
        })
      ),
    [ledgerItemsByCategory]
  );

  const issuedData = Array.isArray(issuedReport?.data) ? issuedReport.data : [];
  const issuedTotal = issuedReport?.total ?? 0;
  const missingData = Array.isArray(missingReport?.data) ? missingReport.data : [];
  const missingTotal = missingReport?.total ?? 0;
  const ledgerPayload =
    ledgerReport != null && typeof ledgerReport === "object" && "data" in ledgerReport
      ? (ledgerReport as { data: LedgerItemPayload }).data
      : undefined;
  const ledgerRows = Array.isArray(ledgerPayload?.rows) ? ledgerPayload.rows : [];
  const ledgerTotal = ledgerPayload?.total ?? 0;
  const ledgerItem: (Item & { category?: ItemCategory | null }) | undefined = ledgerPayload?.item;
  const totalPagesIssued = Math.ceil(issuedTotal / rowCount) || 1;
  const totalPagesMissing = Math.ceil(missingTotal / rowCount) || 1;
  const totalPagesLedger = Math.ceil(ledgerTotal / rowCount) || 1;

  const reportTabs = [
    {
      id: "issued" as ReportType,
      label: "Active Issues",
      icon: FileText,
      count: issuedTotal,
    },
    {
      id: "missing" as ReportType,
      label: "Missing Items",
      icon: AlertTriangle,
      count: missingTotal,
    },
    {
      id: "history" as ReportType,
      label: "Item History (Ledger)",
      icon: History,
      count: ledgerItemId != null ? ledgerTotal : 0,
    },
  ];

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">Reports</h1>
          <p className="text-secondary-600">
            Comprehensive reports and analytics for your QC items
          </p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              {reportTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeReport === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => {
                      setActiveReport(tab.id);
                      setPage(1);
                    }}
                    className={cn(
                      "relative flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all",
                      isActive
                        ? "bg-primary-600 text-white shadow-md"
                        : "bg-secondary-50 text-secondary-700 hover:bg-secondary-100"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs",
                        isActive ? "bg-white/20 text-white" : "bg-secondary-200 text-secondary-600"
                      )}
                    >
                      {tab.count}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <AnimatePresence mode="wait">
          {activeReport === "issued" && (
            <motion.div
              key="issued"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <TransactionFilters
                filters={filters}
                onFiltersChange={(f) => {
                  setFilters(f);
                  resetPagination();
                }}
                companyOptions={companyOptions}
                contractorOptions={contractorOptions}
                machineOptions={machineOptions}
                locationOptions={locationOptions}
                itemOptions={itemOptions}
                onClear={() => {
                  setFilters(defaultFilters);
                  resetPagination();
                }}
                searchPlaceholder="Search by issue no., item, location, operator…"
                className="shadow-sm"
              />
              <ReportToolbar
                rowCount={rowCount}
                onRowCountChange={(v) => {
                  setRowCount(v);
                  setPage(1);
                }}
                onExportExcel={() => handleExportExcel("issued")}
                exportDisabled={loadingIssued}
                exportLabel="Export Excel"
              />
              <Card className="shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle>Active Issues ({issuedTotal})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingIssued ? (
                    <TableSkeleton />
                  ) : issuedData.length > 0 ? (
                    <>
                      <div className="overflow-x-auto rounded-b-lg border border-secondary-200 border-t-0">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-primary-200 bg-primary-100">
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[110px]">
                                Issue No
                              </th>
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[150px]">
                                Entry Date
                              </th>
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[160px]">
                                Item
                              </th>
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[120px]">
                                Location
                              </th>
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[120px]">
                                Issued To
                              </th>
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[130px]">
                                Issued By
                              </th>
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[90px]">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {issuedData.map((issue: any) => (
                              <tr
                                key={issue.id}
                                className="border-b border-secondary-100 hover:bg-primary-50 transition-colors"
                              >
                                <td className="px-4 py-3 font-mono text-secondary-700 text-center">
                                  {issue.issueNo}
                                </td>
                                <td className="px-4 py-3 text-secondary-600 text-center whitespace-nowrap">
                                  {formatDateTime(issue.issuedAt)}
                                </td>
                                <td className="px-4 py-3 font-medium text-text text-center min-w-[160px]">
                                  <div>
                                    <p className="font-medium">{issue.item?.itemName ?? "—"}</p>
                                    {issue.item?.serialNumber && (
                                      <p className="text-xs text-secondary-500 font-mono">
                                        {issue.item.serialNumber}
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-secondary-600 text-center">
                                  {(issue as { location?: { name: string } | null }).location?.name ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-secondary-600 text-center">
                                  {issue.issuedTo ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-secondary-600 text-center">
                                  {issue.issuedByUser
                                    ? `${issue.issuedByUser.firstName} ${issue.issuedByUser.lastName}`
                                    : "—"}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span
                                    className={cn(
                                      "inline-flex px-2.5 py-1 rounded-full text-xs font-medium border",
                                      issue.isReturned
                                        ? "bg-green-100 text-green-700 border-green-200"
                                        : "bg-blue-100 text-blue-700 border-blue-200"
                                    )}
                                  >
                                    {issue.isReturned ? "Returned" : "Active"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {issuedTotal > rowCount && (
                        <Pagination
                          page={page}
                          totalPages={totalPagesIssued}
                          onPageChange={setPage}
                          total={issuedTotal}
                          limit={rowCount}
                        />
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-secondary-500 text-lg">
                        {hasActiveFilters(filters)
                          ? "No active issues match your filters."
                          : "No active issues found."}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeReport === "missing" && (
            <motion.div
              key="missing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <TransactionFilters
                filters={missingFilters}
                onFiltersChange={(f) => {
                  setMissingFilters(f);
                  resetPagination();
                }}
                companyOptions={companyOptions}
                contractorOptions={contractorOptions}
                machineOptions={machineOptions}
                locationOptions={locationOptions}
                itemOptions={itemOptions}
                onClear={() => {
                  setMissingFilters(defaultFilters);
                  resetPagination();
                }}
                searchPlaceholder="Search by item name, serial, issue no., company, contractor, machine, location…"
                className="shadow-sm"
              />
              <ReportToolbar
                rowCount={rowCount}
                onRowCountChange={(v) => {
                  setRowCount(v);
                  setPage(1);
                }}
                onExportExcel={() => handleExportExcel("missing")}
                exportDisabled={loadingMissing}
                exportLabel="Export Excel"
              />
              <Card className="shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle>Missing Items ({missingTotal})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingMissing ? (
                    <TableSkeleton />
                  ) : missingData.length > 0 ? (
                    <>
                      <div className="overflow-x-auto rounded-b-lg border border-secondary-200 border-t-0">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-primary-200 bg-primary-100">
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap">
                                Serial No
                              </th>
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap">
                                Item Name
                              </th>
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap">
                                Location
                              </th>
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap">
                                Description
                              </th>
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap">
                                Total Issues
                              </th>
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap">
                                Status
                              </th>
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap">
                                Created At
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {missingData.map((item: any) => (
                              <tr
                                key={item.id}
                                className="border-b border-secondary-100 hover:bg-primary-50 transition-colors"
                              >
                                <td className="px-4 py-3 font-mono text-secondary-700 text-center">
                                  {item.serialNumber ?? "—"}
                                </td>
                                <td className="px-4 py-3 font-medium text-text text-center">
                                  {item.itemName}
                                </td>
                                <td className="px-4 py-3 text-secondary-600 text-center">
                                  {item.issues?.[0]?.location?.name ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-secondary-600 text-center">
                                  {item.description ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-secondary-600 text-center">
                                  {item.issues?.length ?? 0}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                    {item.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-secondary-600 text-center whitespace-nowrap">
                                  {formatDateTime(item.createdAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {missingTotal > rowCount && (
                        <Pagination
                          page={page}
                          totalPages={totalPagesMissing}
                          onPageChange={setPage}
                          total={missingTotal}
                          limit={rowCount}
                        />
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-secondary-500 text-lg">
                        {hasActiveFilters(missingFilters)
                          ? "No missing items match your filters."
                          : "No missing items found."}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeReport === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <Card className="shadow-sm border-primary-200 bg-primary-50/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Select item for ledger</CardTitle>
                  <p className="text-sm text-secondary-600 font-normal mt-1">
                    Choose a category, then an item. The table below shows the full history for that item. Use filters to narrow results; export uses the same filters.
                  </p>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-4">
                  <div className="min-w-0 flex-1 sm:min-w-[200px] max-w-[280px]">
                    <Label className="text-sm font-medium text-secondary-700 mb-1.5 block">
                      Category
                    </Label>
                    <SearchableSelect
                      id="ledger-category"
                      options={categoryOptions}
                      value={ledgerCategoryId ?? ""}
                      onChange={(v) => {
                        setLedgerCategoryId(v ? Number(v) : null);
                        setLedgerSelectedItemId(null);
                        resetPagination();
                      }}
                      placeholder="All categories"
                      searchPlaceholder="Search category..."
                      aria-label="Category"
                    />
                  </div>
                  <div className="min-w-0 flex-1 sm:min-w-[220px] max-w-[320px]">
                    <Label className="text-sm font-medium text-secondary-700 mb-1.5 block">
                      Item
                    </Label>
                    <SearchableSelect
                      id="ledger-item"
                      options={ledgerItemOptions}
                      value={ledgerSelectedItemId ?? ""}
onChange={(v) => {
                          const id = v ? Number(v) : null;
                          setLedgerSelectedItemId(id);
                          setLedgerFilters((prev) => ({
                            ...prev,
                            itemIds: id != null ? [id] : [],
                          }));
                          resetPagination();
                        }}
                      placeholder={ledgerCategoryId != null ? "Select item in this category" : "Select category first or pick any item"}
                      searchPlaceholder="Search item..."
                      aria-label="Item"
                    />
                  </div>
                </CardContent>
              </Card>
              <TransactionFilters
                filters={ledgerFilters}
                onFiltersChange={(f) => {
                  setLedgerFilters(f);
                  const itemId = f.itemIds?.[0] ?? null;
                  setLedgerSelectedItemId(itemId);
                  if (itemId != null) {
                    const item = filterItems.find((i: { id: number; categoryId?: number | null }) => i.id === itemId);
                    if (item?.categoryId != null) setLedgerCategoryId(item.categoryId);
                  }
                  resetPagination();
                }}
                companyOptions={companyOptions}
                contractorOptions={contractorOptions}
                machineOptions={machineOptions}
                locationOptions={locationOptions}
                itemOptions={ledgerItemOptions}
                onClear={() => {
                  setLedgerFilters(defaultFilters);
                  setLedgerDateFrom("");
                  setLedgerDateTo("");
                  setLedgerCategoryId(null);
                  setLedgerSelectedItemId(null);
                  resetPagination();
                }}
                searchPlaceholder="Search by issue no., description, company, contractor, machine, location, by, remarks, condition…"
                className="shadow-sm"
              />
              <Card className="shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="min-w-0 flex flex-col">
                      <Label className="text-sm font-medium text-secondary-700 mb-1.5">
                        Date from
                      </Label>
                      <Input
                        type="date"
                        value={ledgerDateFrom}
                        onChange={(e) => {
                          setLedgerDateFrom(e.target.value);
                          resetPagination();
                        }}
                        className="h-10 rounded-lg border-secondary-300"
                      />
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <Label className="text-sm font-medium text-secondary-700 mb-1.5">
                        Date to
                      </Label>
                      <Input
                        type="date"
                        value={ledgerDateTo}
                        onChange={(e) => {
                          setLedgerDateTo(e.target.value);
                          resetPagination();
                        }}
                        className="h-10 rounded-lg border-secondary-300"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-secondary-500 mt-2">
                    Use the category and item selectors above, then apply filters (date range, search, company, etc.) as needed. Export Excel uses the same filters. Recent transactions appear first.
                  </p>
                </CardContent>
              </Card>
              {ledgerItem && (
                <Card className="shadow-sm border-primary-200 bg-primary-50/30">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-secondary-600 uppercase tracking-wide">
                      Ledger for
                    </p>
                    <p className="text-sm font-semibold text-text mt-0.5">
                      {ledgerItem.category ? (
                        <>
                          <span className="text-primary-600">{ledgerItem.category.name}</span>
                          <span className="text-secondary-400 mx-2">»</span>
                        </>
                      ) : null}
                      {ledgerItem.itemName}
                      {ledgerItem.serialNumber && (
                        <span className="font-mono text-secondary-600 ml-2">
                          ({ledgerItem.serialNumber})
                        </span>
                      )}
                    </p>
                    {ledgerItem.category && (
                      <p className="text-xs text-secondary-500 mt-1">
                        Category: {ledgerItem.category.name} · Item: {ledgerItem.itemName}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
              <ReportToolbar
                rowCount={rowCount}
                onRowCountChange={(v) => {
                  setRowCount(v);
                  setPage(1);
                }}
                onExportExcel={() => handleExportExcel("history")}
                exportDisabled={loadingLedger || ledgerItemId == null}
                exportLabel="Export Excel"
              />
              <Card className="shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle>
                    Item History (Ledger)
                    {ledgerItem
                      ? ` — ${ledgerItem.itemName} (${ledgerTotal} records)`
                      : " — Select a category and item above"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {ledgerItemId == null ? (
                    <div className="text-center py-12">
                      <p className="text-secondary-500 text-lg">
                        Select an item in the filter bar to view full traceability from beginning to end.
                      </p>
                    </div>
                  ) : loadingLedger ? (
                    <TableSkeleton />
                  ) : ledgerRows.length > 0 ? (
                    <>
                      <div className="overflow-x-auto rounded-b-lg border border-secondary-200 border-t-0">
                        <table className="w-full text-left text-sm min-w-[1200px]">
                          <thead>
                            <tr className="border-b border-primary-200 bg-primary-100">
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[140px] w-[140px]">
                                Date
                              </th>
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[90px] w-[90px]">
                                Event
                              </th>
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[100px] w-[100px]">
                                Issue No
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
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[160px]">
                                Description
                              </th>
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[100px] w-[100px]">
                                Condition
                              </th>
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[120px]">
                                By
                              </th>
                              <th className="px-4 py-3 font-semibold text-primary-900 text-center whitespace-nowrap min-w-[140px]">
                                Remarks
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {ledgerRows.map((row: LedgerRow, idx: number) => (
                              <tr
                                key={`${row.issueNo}-${row.date}-${idx}`}
                                className="border-b border-secondary-100 hover:bg-primary-50 transition-colors"
                              >
                                <td className="px-4 py-3 text-secondary-600 text-center whitespace-nowrap">
                                  {formatDateTime(row.date)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span
                                    className={cn(
                                      "inline-flex px-2.5 py-1 rounded-full text-xs font-medium border",
                                      row.type === "issue"
                                        ? "bg-blue-100 text-blue-700 border-blue-200"
                                        : "bg-green-100 text-green-700 border-green-200"
                                    )}
                                  >
                                    {row.type === "issue" ? "Issued" : "Returned"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-mono text-secondary-700 text-center">
                                  {row.issueNo}
                                </td>
                                <td className="px-4 py-3 text-secondary-600 text-center">
                                  {row.company ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-secondary-600 text-center">
                                  {row.contractor ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-secondary-600 text-center">
                                  {row.machine ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-secondary-600 text-center">
                                  {row.location ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-secondary-600 text-center">
                                  {row.description}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span
                                    className={cn(
                                      "inline-flex px-2.5 py-1 rounded-full text-xs font-medium border",
                                      row.condition === "OK"
                                        ? "bg-green-100 text-green-700 border-green-200"
                                        : row.condition === "Damaged"
                                          ? "bg-amber-100 text-amber-700 border-amber-200"
                                          : row.condition === "Calibration Required"
                                            ? "bg-blue-100 text-blue-700 border-blue-200"
                                            : row.condition === "Missing"
                                              ? "bg-red-100 text-red-700 border-red-200"
                                              : "bg-secondary-100 text-secondary-700 border-secondary-200"
                                    )}
                                  >
                                    {row.condition ?? "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-secondary-600 text-center">
                                  {row.user ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-secondary-600 text-center">
                                  {row.remarks ?? "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {ledgerTotal > rowCount && (
                        <Pagination
                          page={page}
                          totalPages={totalPagesLedger}
                          onPageChange={setPage}
                          total={ledgerTotal}
                          limit={rowCount}
                        />
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-secondary-500 text-lg">
                        {hasActiveFilters(ledgerFilters) || ledgerDateFrom || ledgerDateTo
                          ? "No ledger records match your filters."
                          : "No traceability records for this item."}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}

function ReportToolbar({
  rowCount,
  onRowCountChange,
  onExportExcel,
  exportDisabled,
  exportLabel,
}: {
  rowCount: RowCount;
  onRowCountChange: (v: RowCount) => void;
  onExportExcel: () => void;
  exportDisabled: boolean;
  exportLabel: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Label htmlFor="report-row-count" className="text-sm font-medium text-secondary-700">
              Rows per page
            </Label>
            <select
              id="report-row-count"
              value={rowCount}
              onChange={(e) => {
                const v = Number(e.target.value) as RowCount;
                if (ROW_COUNT_OPTIONS.includes(v)) onRowCountChange(v);
              }}
              className="flex h-10 rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-w-[80px]"
            >
              {ROW_COUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={onExportExcel}
            disabled={exportDisabled}
            className="shadow-md"
          >
            <Download className="w-4 h-4 mr-2" />
            {exportLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      <p className="ml-3 text-secondary-600">Loading...</p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  limit,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  total: number;
  limit: number;
}) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-secondary-200 bg-secondary-50/50 text-sm text-secondary-600">
      <span>
        Showing {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-9 px-3"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="min-w-[100px] text-center font-medium">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="h-9 px-3"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
