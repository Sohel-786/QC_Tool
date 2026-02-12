"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building2,
  MapPin,
  Briefcase,
  Tag,
  Cog,
  Package,
  Layers,
  ClipboardList,
  ArrowLeftRight,
  BarChart3,
  LayoutDashboard,
  Settings,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUserPermissions } from "@/hooks/use-settings";

const navigationSections = {
  dashboard: [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      gradient: "from-blue-500 to-indigo-600",
      hoverColor: "text-blue-600",
      permission: "viewDashboard",
    },
  ],
  masterEntries: [
    {
      href: "/divisions",
      label: "Division",
      icon: LayoutGrid,
      gradient: "from-blue-600 to-cyan-600",
      hoverColor: "text-blue-600",
      permission: "viewDivisionMaster",
    },
    {
      href: "/companies",
      label: "Company",
      icon: Building2,
      gradient: "from-violet-500 to-purple-600",
      hoverColor: "text-violet-600",
      permission: "viewCompanyMaster",
    },
    {
      href: "/locations",
      label: "Location",
      icon: MapPin,
      gradient: "from-emerald-500 to-teal-600",
      hoverColor: "text-emerald-600",
      permission: "viewLocationMaster",
    },
    {
      href: "/contractors",
      label: "Contractor",
      icon: Briefcase,
      gradient: "from-orange-500 to-amber-600",
      hoverColor: "text-orange-600",
      permission: "viewContractorMaster",
    },
    {
      href: "/machines",
      label: "Machine",
      icon: Cog,
      gradient: "from-cyan-500 to-blue-600",
      hoverColor: "text-cyan-600",
      permission: "viewMachineMaster",
    },
    {
      href: "/item-categories",
      label: "Category",
      icon: Layers,
      gradient: "from-teal-500 to-emerald-600",
      hoverColor: "text-teal-600",
      permission: "viewItemCategoryMaster",
    },
    {
      href: "/items",
      label: "Item",
      icon: Package,
      gradient: "from-indigo-500 to-blue-600",
      hoverColor: "text-indigo-600",
      permission: "viewItemMaster",
    },
    {
      href: "/statuses",
      label: "Status",
      icon: Tag,
      gradient: "from-pink-500 to-rose-600",
      hoverColor: "text-pink-600",
      permission: "viewStatusMaster",
    },
  ],
  transactionEntries: [
    {
      href: "/issues",
      label: "Outward",
      icon: ClipboardList,
      gradient: "from-red-500 to-pink-600",
      hoverColor: "text-red-600",
      permission: "viewOutward",
    },
    {
      href: "/returns",
      label: "Inward",
      icon: ArrowLeftRight,
      gradient: "from-green-500 to-emerald-600",
      hoverColor: "text-green-600",
      permission: "viewInward",
    },
  ],
  other: [
    {
      href: "/reports",
      label: "Reports",
      icon: BarChart3,
      gradient: "from-amber-500 to-orange-600",
      hoverColor: "text-amber-600",
      permission: "viewReports",
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      gradient: "from-slate-500 to-gray-600",
      hoverColor: "text-slate-600",
      permission: "accessSettings",
    },
  ],
};

interface HorizontalNavProps {
  isExpanded: boolean;
}

export function HorizontalNav({ isExpanded }: HorizontalNavProps) {
  const pathname = usePathname();
  const { data: permissions } = useCurrentUserPermissions();

  const filterItems = (items: any[]) => {
    return items.filter((item) => {
      if (!permissions) return false;
      const key = item.permission as keyof typeof permissions;
      return !!permissions[key];
    });
  };

  const visibleDashboard = filterItems(navigationSections.dashboard);
  const visibleMasterEntries = filterItems(navigationSections.masterEntries);
  const visibleTransactionEntries = filterItems(
    navigationSections.transactionEntries,
  );
  const visibleOther = filterItems(navigationSections.other);

  const renderNavItem = (item: (typeof navigationSections.dashboard)[0]) => {
    const Icon = item.icon;
    const isActive =
      pathname === item.href || pathname.startsWith(`${item.href}/`);

    return (
      <Link key={item.href} href={item.href}>
        <div
          className={cn(
            "flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl transition-all duration-500 min-w-[95px] group cursor-pointer relative",
            "border-[1.5px]",
            isActive
              ? "bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] scale-105 -translate-y-1.5 border-primary-600"
              : "border-primary-600/20 hover:border-primary-600/40 hover:bg-white hover:shadow-2xl hover:-translate-y-1 active:scale-95",
          )}
        >
          <div
            className={cn(
              "p-2.5 rounded-xl transition-all duration-500 flex items-center justify-center shadow-sm",
              "bg-gradient-to-br",
              item.gradient,
              isActive
                ? "scale-110 shadow-lg"
                : "opacity-90 group-hover:opacity-100 group-hover:scale-110"
            )}
          >
            <Icon className="w-5 h-5 text-white drop-shadow-sm" strokeWidth={2.5} />
          </div>
          <span
            className={cn(
              "text-[10px] uppercase font-extrabold text-center whitespace-nowrap transition-colors tracking-widest",
              isActive
                ? "text-primary-700"
                : "text-secondary-400 group-hover:text-primary-600",
            )}
          >
            {item.label}
          </span>
          {isActive && (
            <motion.div
              layoutId="activeTabIndicator"
              className="absolute -bottom-1.5 inset-x-0 mx-auto w-10 h-1 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 shadow-[0_2px_10px_rgba(59,130,246,0.3)]"
              transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
            />
          )}
        </div>
      </Link>
    );
  };

  const renderDivider = () => (
    <div className="self-stretch w-px bg-secondary-200 mx-1 my-3"></div>
  );

  return (
    <nav className="w-full bg-white border-b border-secondary-200 shadow-sm sticky top-[3.5rem] z-30 ">
      <div
        className={cn(
          "transition-all duration-300 ease-in-out px-4",
          isExpanded
            ? "max-h-[400px] opacity-100 translate-y-0 py-3"
            : "max-h-0 opacity-0 -translate-y-4 overflow-hidden py-0",
        )}
      >
        <div className="overflow-x-auto pb-2 scrollbar-hide pl-2 pr-2">
          <div className="flex items-end gap-3 min-w-max">
            {/* Dashboard Section */}
            {visibleDashboard.length > 0 && (
              <div className="flex items-center gap-3">
                {visibleDashboard.map(renderNavItem)}
                {(visibleMasterEntries.length > 0 ||
                  visibleTransactionEntries.length > 0 ||
                  visibleOther.length > 0) &&
                  renderDivider()}
              </div>
            )}

            {/* Master Entries Section */}
            {visibleMasterEntries.length > 0 && (permissions?.viewMaster || permissions?.viewDivisionMaster) && (
              <div className="flex flex-col items-center gap-2">
                <h3 className="text-[10px] font-bold text-primary-600 uppercase tracking-widest flex items-center gap-1.5 px-4">
                  Master Entry
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex gap-3">
                    {visibleMasterEntries.map(renderNavItem)}
                  </div>
                  {(visibleTransactionEntries.length > 0 ||
                    visibleOther.length > 0) &&
                    renderDivider()}
                </div>
              </div>
            )}

            {/* Transaction Entries Section */}
            {visibleTransactionEntries.length > 0 && (
              <div className="flex flex-col items-center gap-2">
                <h3 className="text-[10px] font-bold text-primary-600 uppercase tracking-widest flex items-center gap-1.5 px-4">
                  Transaction Entries
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex gap-3">
                    {visibleTransactionEntries.map(renderNavItem)}
                  </div>
                  {visibleOther.length > 0 && renderDivider()}
                </div>
              </div>
            )}

            {/* Other Section (Reports & Settings) */}
            <div className="flex gap-3">
              {visibleOther.length > 0 && visibleOther.map(renderNavItem)}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
