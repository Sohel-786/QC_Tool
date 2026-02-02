"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
import {
  useAppSettings,
  useCurrentUserPermissions,
} from "@/hooks/use-settings";
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

const SidebarText = ({
  show,
  children,
  className = "",
}: {
  show: boolean;
  children: React.ReactNode;
  className?: string;
}) => (
  <AnimatePresence mode="popLayout">
    {show && (
      <motion.span
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -5 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={`whitespace-nowrap ml-3 ${className}`}
      >
        {children}
      </motion.span>
    )}
  </AnimatePresence>
);

const masterEntries: NavLink[] = [
  { href: "/companies", label: "Company Master", icon: Building2 },
  { href: "/locations", label: "Location Master", icon: MapPin },
  { href: "/contractors", label: "Contractor Master", icon: Briefcase },
  { href: "/statuses", label: "Status Master", icon: Tag },
  { href: "/machines", label: "Machine Master", icon: Cog },
  { href: "/items", label: "Item Master", icon: Package },
  { href: "/item-categories", label: "Item Category Master", icon: Layers },
  // { href: "/users", label: "User Master", icon: Building2 }, // Assuming User endpoint, or if not in original just keep original
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
  const [isHovered, setIsHovered] = useState(false);

  // Standard expanded width to use during hover (overlay mode)
  // This matches typical expanded width; adjust if parent layout uses a different value
  const HOVER_EXPANDED_WIDTH = 256;

  const companyName =
    (profileDraft?.companyName ?? appSettings?.companyName ?? "").trim() || "";
  const softwareName =
    (
      profileDraft?.softwareName ??
      appSettings?.softwareName ??
      appSettings?.companyName ??
      ""
    ).trim() || "QC Item System";

  // Show full sidebar if manually expanded OR if hovered (while collapsed)
  const showFullSidebar = expanded || isHovered;

  // Calculate effective width for the aside element
  // If expanded: rely on passed sidebarWidth (controlled by parent)
  // If collapsed but hovered: use fixed HOVER_EXPANDED_WIDTH (overlay)
  // If collapsed and not hovered: use passed sidebarWidth (collapsed size)
  const currentWidth = expanded
    ? sidebarWidth
    : isHovered
      ? HOVER_EXPANDED_WIDTH
      : sidebarWidth;

  const canViewDashboard = permissions?.viewDashboard ?? true;
  const canViewMaster = permissions?.viewMaster ?? true;
  const canViewOutward = permissions?.viewOutward ?? true;
  const canViewInward = permissions?.viewInward ?? true;
  const canViewReports = permissions?.viewReports ?? true;
  const canAccessSettings = permissions?.accessSettings ?? (userRole === Role.QC_ADMIN);
  const transactionEntries = transactionEntriesAll.filter(
    (e) =>
      (e.href === "/issues" && canViewOutward) ||
      (e.href === "/returns" && canViewInward),
  );

  useEffect(() => {
    const inMaster = masterEntries.some((e) => e.href === pathname);
    const inTransaction = transactionEntriesAll.some(
      (e) => e.href === pathname,
    );
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
      "flex items-center gap-2 rounded-md transition-all text-sm cursor-pointer " +
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
      className="h-screen fixed left-0 top-0 flex flex-col bg-white border-r border-secondary-200 shadow-lg z-50 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-auto"
      style={{ width: currentWidth }}
      onMouseEnter={() => !expanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header: when wrapped = only expand button; when expanded = text + collapse button (no logo) */}
      <div
        className={`shrink-0 border-b border-secondary-200 bg-gradient-to-r from-primary-600 to-primary-700 flex transition-[padding] duration-300 ${showFullSidebar
          ? "min-h-[5.5rem] px-4 py-3 flex-row items-center gap-3"
          : "min-h-[3rem] px-2 py-2 flex-row items-center justify-center"
          }`}
      >
        {showFullSidebar ? (
          <>
            <div className="min-w-0 flex-1 flex flex-col justify-center gap-1.5">
              {companyName && (
                <SidebarText
                  show={showFullSidebar}
                  className="!ml-0 text-base font-bold text-white/90 truncate leading-tight block"
                >
                  {companyName}
                </SidebarText>
              )}
              <SidebarText
                show={showFullSidebar}
                className="!ml-0 text-sm font-semibold text-white truncate leading-tight block"
              >
                {softwareName}
              </SidebarText>
              <SidebarText
                show={showFullSidebar}
                className="!ml-0 text-xs text-white/90 leading-tight block"
              >
                {portalLabel}
              </SidebarText>
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
      <nav className="flex-1 overflow-y-hidden hover:overflow-y-auto overflow-x-hidden py-2 px-2">
        <div className="space-y-0.5">
          {canViewDashboard && (
            <Link href="/dashboard">
              <motion.div
                whileHover={showFullSidebar ? { x: 2 } : {}}
                className={linkClass("/dashboard", !showFullSidebar)}
              >
                <LayoutDashboard className="w-5 h-5 shrink-0" />
                <SidebarText show={showFullSidebar} className="-ml-1">
                  Dashboard
                </SidebarText>
              </motion.div>
            </Link>
          )}

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
                    <SidebarText show={showFullSidebar} className="-ml-1">
                      Master Entry
                    </SidebarText>
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
                        return (
                          <Link key={item.href} href={item.href}>
                            <motion.div
                              whileHover={{ x: 2 }}
                              className={linkClass(item.href, false)}
                            >
                              <Icon className="w-5 h-5 shrink-0" />
                              <SidebarText
                                show={showFullSidebar}
                                className="-ml-1"
                              >
                                {item.label}
                              </SidebarText>
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
                    const cellClass = `flex items-center justify-center p-2 rounded-md transition-colors ${pathname === item.href
                      ? "bg-primary-50 text-primary-600"
                      : "text-secondary-700 hover:bg-secondary-50"
                      }`;
                    return (
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
                    <SidebarText show={showFullSidebar} className="-ml-1">
                      Transaction Entry
                    </SidebarText>
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
                        return (
                          <Link key={item.href} href={item.href}>
                            <motion.div
                              whileHover={{ x: 2 }}
                              className={linkClass(item.href, false)}
                            >
                              <Icon className="w-5 h-5 shrink-0" />
                              <SidebarText
                                show={showFullSidebar}
                                className="-ml-1"
                              >
                                {item.label}
                              </SidebarText>
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
                    const cellClass = `flex items-center justify-center p-2 rounded-md transition-colors ${pathname === item.href
                      ? "bg-primary-50 text-primary-600"
                      : "text-secondary-700 hover:bg-secondary-50"
                      }`;
                    return (
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
            {canViewReports && (
              <Link href="/reports">
                <motion.div
                  whileHover={showFullSidebar ? { x: 2 } : {}}
                  className={linkClass("/reports", !showFullSidebar)}
                >
                  <BarChart3 className="w-5 h-5 shrink-0" />
                  <SidebarText show={showFullSidebar} className="-ml-1">
                    Reports
                  </SidebarText>
                </motion.div>
              </Link>
            )}
            {canAccessSettings && (
              <Link href="/settings">
                <motion.div
                  whileHover={showFullSidebar ? { x: 2 } : {}}
                  className={linkClass("/settings", !showFullSidebar)}
                >
                  <Settings className="w-5 h-5 shrink-0" />
                  <SidebarText show={showFullSidebar} className="-ml-1">
                    Settings
                  </SidebarText>
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
          <SidebarText show={showFullSidebar} className="-ml-1 text-red-600">
            Logout
          </SidebarText>
        </Button>
      </div>
    </aside>
  );
}
