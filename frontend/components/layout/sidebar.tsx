"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Wrench,
  Building,
  ClipboardList,
  ArrowLeftRight,
  BarChart3,
  LogOut,
  Layers,
} from "lucide-react";
import { Role } from "@/types";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

interface SidebarProps {
  userRole: Role;
  currentUser?: any;
}

// QC Manager menu items (view-only for most, full access to reports and users)
const managerMenuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/divisions", label: "Division", icon: Building },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/users", label: "User Accounts", icon: Users },
];

// QC User menu items (restricted access - only tool management, inward, outward, and reports)
const userMenuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tool-categories", label: "Item Category", icon: Layers },
  { href: "/tools", label: "Item Master", icon: Wrench },
  { href: "/divisions", label: "Division", icon: Building },
  { href: "/issues", label: "Outward", icon: ClipboardList },
  { href: "/returns", label: "Inward", icon: ArrowLeftRight },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function Sidebar({ userRole, currentUser }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      router.push("/login");
    } catch (error) {
      router.push("/login");
    }
  };

  const menuItems =
    userRole === Role.QC_MANAGER ? managerMenuItems : userMenuItems;

  return (
    <div className="w-64 bg-white border-r border-secondary-200 h-screen fixed left-0 top-0 flex flex-col shadow-lg z-50">
      <div className="p-6 border-b border-secondary-200 bg-gradient-to-r from-primary-600 to-primary-700">
        <h1 className="text-xl font-bold text-white">QC Tool System</h1>
        <p className="text-xs text-primary-100 mt-1">
          {userRole === Role.QC_MANAGER ? "Management Portal" : "User Portal"}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* Main Menu Items */}
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-primary-50 text-primary-600 font-medium shadow-sm"
                    : "text-secondary-700 hover:bg-secondary-50 hover:text-primary-600"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
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
