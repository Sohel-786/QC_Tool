"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
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
} from "lucide-react";
import { Role } from "@/types";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

interface SidebarProps {
  userRole: Role;
  currentUser?: any;
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

const transactionEntries: NavLink[] = [
  { href: "/issues", label: "Outward", icon: ClipboardList },
  { href: "/returns", label: "Inward", icon: ArrowLeftRight },
];

export function Sidebar({ userRole, currentUser }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [masterOpen, setMasterOpen] = useState(true);
  const [transactionOpen, setTransactionOpen] = useState(true);

  useEffect(() => {
    const inMaster = masterEntries.some((e) => e.href === pathname);
    const inTransaction = transactionEntries.some((e) => e.href === pathname);
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

  const linkClass = (href: string) => {
    const isActive = pathname === href;
    return `flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all text-sm ${
      isActive
        ? "bg-primary-50 text-primary-600 font-medium shadow-sm"
        : "text-secondary-700 hover:bg-secondary-50 hover:text-primary-600"
    }`;
  };

  const sectionHeaderClass =
    "flex items-center justify-between w-full px-4 py-3 rounded-lg text-secondary-700 hover:bg-secondary-50 transition-all text-sm font-medium";

  return (
    <div className="w-64 bg-white border-r border-secondary-200 h-screen fixed left-0 top-0 flex flex-col shadow-lg z-50">
      <div className="p-6 border-b border-secondary-200 bg-gradient-to-r from-primary-600 to-primary-700">
        <h1 className="text-xl font-bold text-white">QC Item System</h1>
        <p className="text-xs text-primary-100 mt-1">
          {userRole === Role.QC_MANAGER ? "Management Portal" : "User Portal"}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <Link href="/dashboard">
          <motion.div whileHover={{ x: 4 }} className={linkClass("/dashboard")}>
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            <span>Dashboard</span>
          </motion.div>
        </Link>

        {/* Master Entry dropdown */}
        <div className="pt-2">
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
              className="pl-2 mt-1 space-y-0.5"
            >
              {masterEntries.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      className={linkClass(item.href)}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{item.label}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Transaction Entry dropdown */}
        <div className="pt-1">
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
              className="pl-2 mt-1 space-y-0.5"
            >
              {transactionEntries.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      className={linkClass(item.href)}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{item.label}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </motion.div>
          )}
        </div>

        <div className="pt-2 border-t border-secondary-100 mt-2">
          <Link href="/reports">
            <motion.div
              whileHover={{ x: 4 }}
              className={linkClass("/reports")}
            >
              <BarChart3 className="w-5 h-5 shrink-0" />
              <span>Reports</span>
            </motion.div>
          </Link>
          {userRole === Role.QC_MANAGER && (
            <Link href="/users" className="block mt-0.5">
              <motion.div
                whileHover={{ x: 4 }}
                className={linkClass("/users")}
              >
                <Users className="w-5 h-5 shrink-0" />
                <span>User Accounts</span>
              </motion.div>
            </Link>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-secondary-200 bg-secondary-50">
        <Button
          variant="ghost"
          className="w-full justify-start hover:bg-red-50 hover:text-red-600"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );
}
