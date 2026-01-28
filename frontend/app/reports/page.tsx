"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { Issue, Tool } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import {
  Search,
  Download,
  FileText,
  AlertTriangle,
  History,
} from "lucide-react";

type ReportType = "issued" | "missing" | "history";

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const [activeReport, setActiveReport] = useState<ReportType>("issued");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "missing") setActiveReport("missing");
    else if (section === "active-issues" || section === "issued") setActiveReport("issued");
  }, [searchParams]);

  const { data: issuedTools, isLoading: loadingIssued } = useQuery<Issue[]>({
    queryKey: ["issued-tools-report"],
    queryFn: async () => {
      const response = await api.get("/reports/issued-tools");
      return response.data?.data || [];
    },
  });

  const { data: missingTools, isLoading: loadingMissing } = useQuery<Tool[]>({
    queryKey: ["missing-tools-report"],
    queryFn: async () => {
      const response = await api.get("/reports/missing-tools");
      return response.data?.data || [];
    },
  });

  const { data: toolHistory, isLoading: loadingHistory } = useQuery<any[]>({
    queryKey: ["tool-history-report"],
    queryFn: async () => {
      const response = await api.get("/reports/tool-history");
      return response.data?.data || [];
    },
    enabled: activeReport === "history",
  });

  const handleExport = async (type: ReportType) => {
    try {
      let endpoint = "";
      let filename = "";

      switch (type) {
        case "issued":
          endpoint = "/reports/export/issued-tools";
          filename = "active-issues-report";
          break;
        case "missing":
          endpoint = "/reports/export/missing-tools";
          filename = "missing-tools-report";
          break;
        case "history":
          endpoint = "/reports/export/tool-history";
          filename = "tool-history-report";
          break;
      }

      const response = await api.get(endpoint, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${filename}-${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export report. Please try again.");
    }
  };

  // Filter data based on search term
  const filteredIssuedTools = useMemo(() => {
    if (!issuedTools) return [];
    return issuedTools.filter(
      (issue) =>
        issue.tool?.toolName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        issue.tool?.toolCode
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        issue.issueNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.division?.name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        issue.issuedTo?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [issuedTools, searchTerm]);

  const filteredMissingTools = useMemo(() => {
    if (!missingTools) return [];
    return missingTools.filter(
      (tool) =>
        tool.toolName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.toolCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [missingTools, searchTerm]);

  const filteredToolHistory = useMemo(() => {
    if (!toolHistory) return [];
    return toolHistory.filter(
      (tool) =>
        tool.toolName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.toolCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.issues?.some(
          (issue: any) =>
            issue.issueNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            issue.division?.name
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()),
        ),
    );
  }, [toolHistory, searchTerm]);

  const reportTabs = [
    {
      id: "issued" as ReportType,
      label: "Active Issues",
      icon: FileText,
      count: issuedTools?.length || 0,
    },
    {
      id: "missing" as ReportType,
      label: "Missing Tools",
      icon: AlertTriangle,
      count: missingTools?.length || 0,
    },
    {
      id: "history" as ReportType,
      label: "Tool History (Ledger)",
      icon: History,
      count: toolHistory?.length || 0,
    },
  ];

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">Reports</h1>
          <p className="text-secondary-600">
            Comprehensive reports and analytics for your QC tools
          </p>
        </div>

        {/* Report Type Switcher */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              {reportTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeReport === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => {
                      setActiveReport(tab.id);
                      setSearchTerm("");
                    }}
                    className={`relative flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                      isActive
                        ? "bg-primary-600 text-white shadow-md"
                        : "bg-secondary-50 text-secondary-700 hover:bg-secondary-100"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-secondary-200 text-secondary-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-lg bg-primary-600 -z-10"
                        initial={false}
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sub-header with Search and Export */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
                  <Input
                    placeholder={`Search ${activeReport === "issued" ? "active issues" : activeReport === "missing" ? "missing tools" : "tool history"}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                onClick={() => handleExport(activeReport)}
                className="shadow-md"
                disabled={
                  (activeReport === "issued" && loadingIssued) ||
                  (activeReport === "missing" && loadingMissing) ||
                  (activeReport === "history" && loadingHistory)
                }
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        <AnimatePresence mode="wait">
          {activeReport === "issued" && (
            <motion.div
              key="issued"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>
                    Active Issues ({filteredIssuedTools.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingIssued ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                      <p className="mt-4 text-secondary-600">Loading...</p>
                    </div>
                  ) : filteredIssuedTools.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-secondary-200">
                            <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                              Issue No
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                              Tool
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                              Division
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                              Issued To
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                              Issued By
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                              Issued Date
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredIssuedTools.map((issue: any, index) => (
                            <motion.tr
                              key={issue.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-secondary-100 hover:bg-secondary-50 transition-colors"
                            >
                              <td className="py-4 px-4">
                                <span className="font-mono text-sm font-medium">
                                  {issue.issueNo}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <div>
                                  <p className="font-medium text-text">
                                    {issue.tool?.toolName}
                                  </p>
                                  <p className="text-xs text-secondary-500 font-mono">
                                    {issue.tool?.toolCode}
                                  </p>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-sm text-secondary-600">
                                {issue.division?.name}
                              </td>
                              <td className="py-4 px-4 text-sm text-secondary-600">
                                {issue.issuedTo || "N/A"}
                              </td>
                              <td className="py-4 px-4 text-sm text-secondary-600">
                                {issue.issuedByUser
                                  ? `${issue.issuedByUser.firstName} ${issue.issuedByUser.lastName}`
                                  : "N/A"}
                              </td>
                              <td className="py-4 px-4 text-sm text-secondary-600">
                                {formatDateTime(issue.issuedAt)}
                              </td>
                              <td className="py-4 px-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    issue.isReturned
                                      ? "bg-green-100 text-green-700 border border-green-200"
                                      : "bg-blue-100 text-blue-700 border border-blue-200"
                                  }`}
                                >
                                  {issue.isReturned ? "Returned" : "Active"}
                                </span>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-secondary-500 text-lg">
                        {searchTerm
                          ? "No active issues found matching your search."
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
            >
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>
                    Missing Tools ({filteredMissingTools.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingMissing ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                      <p className="mt-4 text-secondary-600">Loading...</p>
                    </div>
                  ) : filteredMissingTools.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-secondary-200">
                            <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                              Tool Code
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                              Tool Name
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                              Description
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                              Total Issues
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                              Status
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                              Created At
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMissingTools.map((tool: any, index) => (
                            <motion.tr
                              key={tool.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-red-100 hover:bg-red-50 transition-colors"
                            >
                              <td className="py-4 px-4">
                                <span className="font-mono text-sm font-medium text-red-900">
                                  {tool.toolCode}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <p className="font-medium text-red-900">
                                  {tool.toolName}
                                </p>
                              </td>
                              <td className="py-4 px-4 text-sm text-red-700">
                                {tool.description || "N/A"}
                              </td>
                              <td className="py-4 px-4 text-sm text-red-700">
                                {tool.issues?.length || 0}
                              </td>
                              <td className="py-4 px-4">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                  {tool.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-sm text-red-700">
                                {formatDateTime(tool.createdAt)}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-secondary-500 text-lg">
                        {searchTerm
                          ? "No missing tools found matching your search."
                          : "No missing tools. Great job!"}
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
            >
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>
                    Tool History (Ledger) ({filteredToolHistory.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingHistory ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                      <p className="mt-4 text-secondary-600">Loading...</p>
                    </div>
                  ) : filteredToolHistory.length > 0 ? (
                    <div className="space-y-6">
                      {filteredToolHistory.map((tool, toolIndex) => (
                        <motion.div
                          key={tool.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: toolIndex * 0.1 }}
                          className="border border-secondary-200 rounded-lg p-5 bg-white"
                        >
                          <div className="mb-4 pb-4 border-b border-secondary-200">
                            <h3 className="font-semibold text-lg text-text mb-1">
                              {tool.toolName}
                            </h3>
                            <p className="text-sm text-secondary-600 font-mono">
                              Code: {tool.toolCode}
                            </p>
                            <p className="text-xs text-secondary-500 mt-1">
                              Status: {tool.status}
                            </p>
                          </div>
                          {tool.issues && tool.issues.length > 0 ? (
                            <div className="space-y-4">
                              {tool.issues.map(
                                (issue: any, issueIndex: number) => (
                                  <div
                                    key={issue.issue.id}
                                    className="pl-4 border-l-2 border-primary-200 space-y-2"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="font-medium text-text">
                                          Issue #{issue.issue.issueNo} -{" "}
                                          {issue.issue.division?.name}
                                        </p>
                                        <div className="mt-2 space-y-1 text-sm text-secondary-600">
                                          <p>
                                            <span className="font-medium">
                                              Issued:
                                            </span>{" "}
                                            {formatDateTime(
                                              issue.issue.issuedAt,
                                            )}
                                            {issue.issue.issuedTo &&
                                              ` to ${issue.issue.issuedTo}`}
                                          </p>
                                          <p>
                                            <span className="font-medium">
                                              Issued By:
                                            </span>{" "}
                                            {issue.issue.issuedByUser
                                              ? `${issue.issue.issuedByUser.firstName} ${issue.issue.issuedByUser.lastName}`
                                              : "N/A"}
                                          </p>
                                          {issue.issue.remarks && (
                                            <p className="text-secondary-500 italic">
                                              "{issue.issue.remarks}"
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <span
                                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                                          issue.issue.isReturned
                                            ? "bg-green-100 text-green-700 border border-green-200"
                                            : "bg-blue-100 text-blue-700 border border-blue-200"
                                        }`}
                                      >
                                        {issue.issue.isReturned
                                          ? "Returned"
                                          : "Active"}
                                      </span>
                                    </div>
                                    {issue.returns &&
                                      issue.returns.length > 0 && (
                                        <div className="mt-3 ml-4 space-y-2">
                                          {issue.returns.map((return_: any) => (
                                            <div
                                              key={return_.id}
                                              className="pl-4 border-l-2 border-green-200 bg-green-50 p-3 rounded"
                                            >
                                              <p className="text-sm font-medium text-green-900">
                                                Returned:{" "}
                                                {formatDateTime(
                                                  return_.returnedAt,
                                                )}
                                              </p>
                                              <p className="text-xs text-green-700 mt-1">
                                                Returned By:{" "}
                                                {return_.returnedByUser
                                                  ? `${return_.returnedByUser.firstName} ${return_.returnedByUser.lastName}`
                                                  : "N/A"}
                                              </p>
                                              {return_.remarks && (
                                                <p className="text-xs text-green-600 mt-1 italic">
                                                  "{return_.remarks}"
                                                </p>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-secondary-500 italic">
                              No issue history for this tool.
                            </p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-secondary-500 text-lg">
                        {searchTerm
                          ? "No tool history found matching your search."
                          : "No tool history found."}
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
