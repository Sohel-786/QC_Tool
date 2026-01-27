'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Wrench,
  Building,
  FileText,
  ClipboardList,
  ArrowLeftRight,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { Role } from '@/types';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  userRole: Role;
}

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.QC_USER, Role.QC_MANAGER] },
  { href: '/users', label: 'Users', icon: Users, roles: [Role.QC_MANAGER] },
  { href: '/tools', label: 'Tools', icon: Wrench, roles: [Role.QC_USER, Role.QC_MANAGER] },
  { href: '/divisions', label: 'Divisions', icon: Building, roles: [Role.QC_USER, Role.QC_MANAGER] },
  { href: '/issues', label: 'Issues', icon: ClipboardList, roles: [Role.QC_USER, Role.QC_MANAGER] },
  { href: '/returns', label: 'Returns', icon: ArrowLeftRight, roles: [Role.QC_USER, Role.QC_MANAGER] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: [Role.QC_USER, Role.QC_MANAGER] },
];

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      router.push('/login');
    } catch (error) {
      router.push('/login');
    }
  };

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(userRole),
  );

  return (
    <div className="w-64 bg-white border-r border-secondary-200 h-screen fixed left-0 top-0 flex flex-col shadow-lg z-50">
      <div className="p-6 border-b border-secondary-200 bg-gradient-to-r from-primary-600 to-primary-700">
        <h1 className="text-xl font-bold text-white">QC Tool System</h1>
        <p className="text-xs text-primary-100 mt-1">Management Portal</p>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 font-medium shadow-sm'
                    : 'text-secondary-700 hover:bg-secondary-50 hover:text-primary-600'
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
