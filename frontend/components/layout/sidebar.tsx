"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Building2,
  MapPin,
  Briefcase,
  Tag,
  Cog,
  ClipboardList,
  ArrowLeftRight,
  BarChart3,
  LogOut,
  Layers,
  ChevronDown,
  ChevronRight,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Role } from "@/types";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAppSettings, useCurrentUserPermissions } from "@/hooks/use-settings";
import { useSoftwareProfileDraft } from "@/contexts/software-profile-draft-context";

interface SidebarProps {
  userRole: Role;
  currentUser?: any;
  expanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  sidebarWidth: number;
}

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const masterEntries: NavLink[] = [
  { href: "/companies", label: "Company Master", icon: Building2 },
  { href: "/locations", label: "Location Master", icon: MapPin },
  { href: "/contractors", label: "Contractor Master", icon: Briefcase },
  { href: "/statuses", label: "Status Master", icon: Tag },
  { href: "/machines", label: "Machine Master", icon: Cog },
  { href: "/items", label: "Item Master", icon: Package },
  { href: "/item-categories", label: "Item Category Master", icon: Layers },
];

const transactionEntriesAll: NavLink[] = [
  { href: "/issues", label: "Outward", icon: ClipboardList },
  { href: "/returns", label: "Inward", icon: ArrowLeftRight },
];

export function Sidebar({
  userRole,
  currentUser,
  expanded,
  onExpandChange,
  sidebarWidth,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: appSettings } = useAppSettings();
  const { data: permissions } = useCurrentUserPermissions();
  const profileDraft = useSoftwareProfileDraft()?.draft ?? null;
  const [masterOpen, setMasterOpen] = useState(true);
  const [transactionOpen, setTransactionOpen] = useState(true);

  const isOnSettings = pathname === "/settings";

  const navigateTo = (href: string) => {
    router.push(href);
  };

  const companyName = (profileDraft?.companyName ?? appSettings?.companyName ?? "").trim() || "";
  const softwareName =
    (profileDraft?.softwareName ?? appSettings?.softwareName ?? appSettings?.companyName ?? "").trim() ||
    "QC Item System";

  const showFullSidebar = expanded;
  const canViewDashboard = permissions?.viewDashboard ?? true;
  const canViewMaster = permissions?.viewMaster ?? true;
  const canViewOutward = permissions?.viewOutward ?? true;
  const canViewInward = permissions?.viewInward ?? true;
  const canViewReports = permissions?.viewReports ?? true;
  const canAccessSettings = permissions?.accessSettings ?? false;
  const transactionEntries = transactionEntriesAll.filter(
    (e) => (e.href === "/issues" && canViewOutward) || (e.href === "/returns" && canViewInward)
  );

  useEffect(() => {
    const inMaster = masterEntries.some((e) => e.href === pathname);
    const inTransaction = transactionEntriesAll.some((e) => e.href === pathname);
    if (inMaster) setMasterOpen(true);
    if (inTransaction) setTransactionOpen(true);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      router.push("/login");
    } catch (error) {
      router.push("/login");
    }
  };

  const portalLabel =
    userRole === Role.QC_ADMIN
      ? "Admin"
      : userRole === Role.QC_MANAGER
        ? "Manager"
        : "User";

  const linkClass = (href: string, iconOnly = false) => {
    const isActive = pathname === href;
    const base =
      "flex items-center gap-2 rounded-md transition-all text-sm " +
      (isActive
        ? "bg-primary-50 text-primary-600 font-medium"
        : "text-secondary-700 hover:bg-secondary-50 hover:text-primary-600");
    return iconOnly
      ? `${base} justify-center px-2 py-2`
      : `${base} px-3 py-1.5`;
  };

  const sectionHeaderClass =
    "flex items-center justify-between w-full px-3 py-1.5 rounded-md text-secondary-700 hover:bg-secondary-50 transition-all text-sm font-medium";

  return (
    <aside
      className="h-screen fixed left-0 top-0 flex flex-col bg-white border-r border-secondary-200 shadow-lg z-50 overflow-hidden transition-[width] duration-200 ease-in-out"
      style={{ width: sidebarWidth }}
    >
      {/* Header: when wrapped = only expand button; when expanded = text + collapse button (no logo) */}
      <div
        className={`shrink-0 border-b border-secondary-200 bg-gradient-to-r from-primary-600 to-primary-700 flex transition-[padding] duration-200 ${
          showFullSidebar
            ? "min-h-[5.5rem] px-4 py-3 flex-row items-center gap-3"
            : "min-h-[3rem] px-2 py-2 flex-row items-center justify-center"
        }`}
      >
        {showFullSidebar ? (
          <>
            <div className="min-w-0 flex-1 flex flex-col justify-center gap-1.5">
              {companyName && (
                <p className="text-base font-bold text-white/90 truncate leading-tight">
                  {companyName}
                </p>
              )}
              <h1 className="text-sm font-semibold text-white truncate leading-tight">
                {softwareName}
              </h1>
              <p className="text-xs text-white/90 leading-tight">{portalLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => onExpandChange(!expanded)}
              className="shrink-0 p-1.5 rounded-md hover:bg-white/20 text-white transition-colors"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onExpandChange(true)}
            className="shrink-0 p-2 rounded-md hover:bg-white/20 text-white transition-colors"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2">
        <div className="space-y-0.5">
          {canViewDashboard &&
            (isOnSettings ? (
              <button
                type="button"
                onClick={() => navigateTo("/dashboard")}
                className={`w-full text-left ${linkClass("/dashboard", !showFullSidebar)}`}
              >
                <LayoutDashboard className="w-5 h-5 shrink-0" />
                {showFullSidebar && <span>Dashboard</span>}
              </button>
            ) : (
              <Link href="/dashboard">
                <motion.div
                  whileHover={showFullSidebar ? { x: 2 } : {}}
                  className={linkClass("/dashboard", !showFullSidebar)}
                >
                  <LayoutDashboard className="w-5 h-5 shrink-0" />
                  {showFullSidebar && <span>Dashboard</span>}
                </motion.div>
              </Link>
            ))}

          {/* Master Entry */}
          {canViewMaster && (
          <div className="pt-1">
            {showFullSidebar ? (
              <>
                <button
                  type="button"
                  onClick={() => setMasterOpen((o) => !o)}
                  className={`${sectionHeaderClass} w-full text-left`}
                  aria-expanded={masterOpen}
                >
                  <span>Master Entry</span>
                  {masterOpen ? (
                    <ChevronDown className="w-4 h-4 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  )}
                </button>
                {masterOpen && (
                  <motion.div
                    initial={false}
                    animate={{ opacity: 1, height: "auto" }}
                    className="pl-1 mt-0.5 space-y-0.5"
                  >
                    {masterEntries.map((item) => {
                      const Icon = item.icon;
                      return isOnSettings ? (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => navigateTo(item.href)}
                          className={`w-full text-left ${linkClass(item.href, false)}`}
                        >
                          <Icon className="w-5 h-5 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      ) : (
                        <Link key={item.href} href={item.href}>
                          <motion.div
                            whileHover={{ x: 2 }}
                            className={linkClass(item.href, false)}
                          >
                            <Icon className="w-5 h-5 shrink-0" />
                            <span>{item.label}</span>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </>
            ) : (
              <div className="space-y-0.5">
                {masterEntries.map((item) => {
                  const Icon = item.icon;
                  const cellClass = `flex items-center justify-center p-2 rounded-md transition-colors ${
                    pathname === item.href
                      ? "bg-primary-50 text-primary-600"
                      : "text-secondary-700 hover:bg-secondary-50"
                  }`;
                  return isOnSettings ? (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => navigateTo(item.href)}
                      title={item.label}
                      className={`w-full ${cellClass}`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                    </button>
                  ) : (
                    <Link key={item.href} href={item.href} title={item.label}>
                      <div className={cellClass}>
                        <Icon className="w-5 h-5 shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          )}

          {/* Transaction Entry */}
          {(canViewOutward || canViewInward) && (
          <div className="pt-0.5">
            {showFullSidebar ? (
              <>
                <button
                  type="button"
                  onClick={() => setTransactionOpen((o) => !o)}
                  className={`${sectionHeaderClass} w-full text-left`}
                  aria-expanded={transactionOpen}
                >
                  <span>Transaction Entry</span>
                  {transactionOpen ? (
                    <ChevronDown className="w-4 h-4 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  )}
                </button>
                {transactionOpen && (
                  <motion.div
                    initial={false}
                    animate={{ opacity: 1, height: "auto" }}
                    className="pl-1 mt-0.5 space-y-0.5"
                  >
                    {transactionEntries.map((item) => {
                      const Icon = item.icon;
                      return isOnSettings ? (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => navigateTo(item.href)}
                          className={`w-full text-left ${linkClass(item.href, false)}`}
                        >
                          <Icon className="w-5 h-5 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      ) : (
                        <Link key={item.href} href={item.href}>
                          <motion.div
                            whileHover={{ x: 2 }}
                            className={linkClass(item.href, false)}
                          >
                            <Icon className="w-5 h-5 shrink-0" />
                            <span>{item.label}</span>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </>
            ) : (
              <div className="space-y-0.5">
                {transactionEntries.map((item) => {
                  const Icon = item.icon;
                  const cellClass = `flex items-center justify-center p-2 rounded-md transition-colors ${
                    pathname === item.href
                      ? "bg-primary-50 text-primary-600"
                      : "text-secondary-700 hover:bg-secondary-50"
                  }`;
                  return isOnSettings ? (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => navigateTo(item.href)}
                      title={item.label}
                      className={`w-full ${cellClass}`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                    </button>
                  ) : (
                    <Link key={item.href} href={item.href} title={item.label}>
                      <div className={cellClass}>
                        <Icon className="w-5 h-5 shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          )}

          {/* Reports & Settings */}
          <div className="pt-1 border-t border-secondary-100 mt-1 space-y-0.5">
            {canViewReports &&
              (isOnSettings ? (
                <button
                  type="button"
                  onClick={() => navigateTo("/reports")}
                  className={`w-full text-left ${linkClass("/reports", !showFullSidebar)}`}
                >
                  <BarChart3 className="w-5 h-5 shrink-0" />
                  {showFullSidebar && <span>Reports</span>}
                </button>
              ) : (
                <Link href="/reports">
                  <motion.div
                    whileHover={showFullSidebar ? { x: 2 } : {}}
                    className={linkClass("/reports", !showFullSidebar)}
                  >
                    <BarChart3 className="w-5 h-5 shrink-0" />
                    {showFullSidebar && <span>Reports</span>}
                  </motion.div>
                </Link>
              ))}
            {canAccessSettings && (
              <Link href="/settings">
                <motion.div
                  whileHover={showFullSidebar ? { x: 2 } : {}}
                  className={linkClass("/settings", !showFullSidebar)}
                >
                  <Settings className="w-5 h-5 shrink-0" />
                  {showFullSidebar && <span>Settings</span>}
                </motion.div>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="shrink-0 p-2 border-t border-secondary-200 bg-secondary-50">
        <Button
          variant="ghost"
          size="sm"
          className={`w-full hover:bg-red-50 hover:text-red-600 ${!showFullSidebar ? "justify-center px-2" : "justify-start"}`}
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {showFullSidebar && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
