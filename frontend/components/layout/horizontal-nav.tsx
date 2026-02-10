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
    const itemColor = item.hoverColor.split("-")[1]; // e.g., 'blue', 'violet'

    return (
      <Link key={item.href} href={item.href}>
        <div
          className={cn(
            "flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 min-w-[95px] group cursor-pointer relative border",
            isActive
              ? "bg-white shadow-[0_12px_40px_rgb(0,0,0,0.1)] scale-105 border-b-2 border-primary-500 -translate-y-1"
              : "border-primary-200 hover:bg-white hover:shadow-xl hover:border-primary-300 hover:-translate-y-1 active:scale-95",
          )}
        >
          <div
            className={cn(
              "p-2.5 rounded-xl transition-all duration-300",
              isActive
                ? `bg-${itemColor}-50 text-${itemColor}-600 shadow-sm ring-1 ring-${itemColor}-200`
                : `text-${itemColor}-600 bg-${itemColor}-50/30 border border-transparent group-hover:border-${itemColor}-200 group-hover:bg-${itemColor}-50 group-hover:shadow-md group-hover:scale-110`,
            )}
          >
            <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
          </div>
          <span
            className={cn(
              "text-[12px] font-bold text-center whitespace-nowrap transition-colors leading-tight",
              isActive
                ? "text-primary-700"
                : "text-secondary-600 group-hover:text-primary-600",
            )}
          >
            {item.label}
          </span>
          {isActive && (
            <motion.div
              layoutId="activeTabGlow"
              className="absolute inset-0 rounded-xl bg-primary-500/5 -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
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
            {visibleMasterEntries.length > 0 && (
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
