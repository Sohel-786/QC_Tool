'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Wrench,
  Building,
  ClipboardList,
  ArrowLeftRight,
  BarChart3,
  LogOut,
  ChevronDown,
  ChevronUp,
  UserPlus,
} from 'lucide-react';
import { Role } from '@/types';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/avatar';

interface SidebarProps {
  userRole: Role;
  currentUser?: any;
}

// QC Manager menu items (view-only for most, full access to reports and users)
const managerMenuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

// QC User menu items (full access)
const userMenuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tools', label: 'Tools', icon: Wrench },
  { href: '/divisions', label: 'Divisions', icon: Building },
  { href: '/issues', label: 'Issues', icon: ClipboardList },
  { href: '/returns', label: 'Returns', icon: ArrowLeftRight },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

export function Sidebar({ userRole, currentUser }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [usersSectionOpen, setUsersSectionOpen] = useState(false);

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (userRole !== Role.QC_MANAGER) return [];
      const response = await api.get('/users');
      return response.data?.data || [];
    },
    enabled: userRole === Role.QC_MANAGER,
  });

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      router.push('/login');
    } catch (error) {
      router.push('/login');
    }
  };

  const menuItems = userRole === Role.QC_MANAGER ? managerMenuItems : userMenuItems;

  return (
    <div className="w-64 bg-white border-r border-secondary-200 h-screen fixed left-0 top-0 flex flex-col shadow-lg z-50">
      <div className="p-6 border-b border-secondary-200 bg-gradient-to-r from-primary-600 to-primary-700">
        <h1 className="text-xl font-bold text-white">QC Tool System</h1>
        <p className="text-xs text-primary-100 mt-1">
          {userRole === Role.QC_MANAGER ? 'Management Portal' : 'User Portal'}
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

        {/* Users Section - Only for Managers */}
        {userRole === Role.QC_MANAGER && (
          <div className="mt-4 pt-4 border-t border-secondary-200">
            <button
              onClick={() => setUsersSectionOpen(!usersSectionOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-secondary-700 hover:bg-secondary-50 transition-all"
            >
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5" />
                <span className="font-medium">Users & Managers</span>
              </div>
              {usersSectionOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            <AnimatePresence>
              {usersSectionOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-1"
                >
                  <Link href="/users">
                    <motion.div
                      whileHover={{ x: 4 }}
                      className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                        pathname === '/users'
                          ? 'bg-primary-50 text-primary-600 font-medium'
                          : 'text-secondary-600 hover:bg-secondary-50'
                      }`}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span className="text-sm">Manage Users</span>
                    </motion.div>
                  </Link>
                  
                  {users && users.length > 0 && (
                    <div className="max-h-64 overflow-y-auto space-y-1 mt-2">
                      {users.map((user: any) => (
                        <Link key={user.id} href={`/users`}>
                          <motion.div
                            whileHover={{ x: 4 }}
                            className="px-4 py-2 rounded-lg text-secondary-600 hover:bg-secondary-50 transition-all"
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                                <span className="text-xs font-semibold text-primary-700">
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-text truncate">
                                  {user.firstName} {user.lastName}
                                </p>
                                <p className="text-xs text-secondary-500 truncate">
                                  {user.role.replace('_', ' ')}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        </Link>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
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
