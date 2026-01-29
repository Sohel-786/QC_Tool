'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { DashboardMetrics, Item, ItemCategory } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package,
  CheckCircle,
  AlertCircle,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type TableView = 'available' | 'total' | null;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tableView, setTableView] = useState<TableView>(null);

  useEffect(() => {
    // First check localStorage for optimistic loading
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setLoading(false);
      } catch {
        router.push('/login');
        return;
      }
    }

    // Validate in background
    api
      .post('/auth/validate')
      .then(() => {
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('user');
        router.push('/login');
      });
  }, [router]);

  const { data: metrics } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const response = await api.get('/dashboard/metrics');
      return response.data.data;
    },
  });

  const { data: availableItems, isLoading: loadingAvailable } = useQuery<Item[]>({
    queryKey: ['items', 'available'],
    queryFn: async () => {
      const response = await api.get('/items/available');
      return response.data?.data || [];
    },
    enabled: tableView === 'available',
  });

  const { data: allItems, isLoading: loadingTotal } = useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: async () => {
      const response = await api.get('/items');
      return response.data?.data || [];
    },
    enabled: tableView === 'total',
  });

  const { data: categories } = useQuery<ItemCategory[]>({
    queryKey: ['item-categories'],
    queryFn: async () => {
      const response = await api.get('/item-categories');
      return response.data?.data || [];
    },
    enabled: tableView === 'available' || tableView === 'total',
  });

  const categoryMap = (categories || []).reduce<Record<number, string>>((acc, c) => {
    acc[c.id] = c.name;
    return acc;
  }, {});

  const totalItemsList =
    tableView === 'total' && allItems
      ? allItems.filter((i) => i.status === 'AVAILABLE' || i.status === 'MISSING')
      : [];
  const tableData = tableView === 'available' ? availableItems || [] : totalItemsList;
  const tableLoading = tableView === 'available' ? loadingAvailable : loadingTotal;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleCardClick = (title: string) => {
    if (title === 'Total Items') setTableView('total');
    else if (title === 'Available') setTableView('available');
    else if (title === 'Missing') router.push('/reports?section=missing');
    else if (title === 'Active Issues') router.push('/reports?section=active-issues');
  };

  const statCards = [
    {
      title: 'Total Items',
      value: metrics?.items.total || 0,
      icon: Package,
      color: 'text-primary-600',
      bgColor: 'bg-gradient-to-br from-primary-50 to-primary-100',
      iconBg: 'bg-primary-600',
      trend: null,
      onClick: () => handleCardClick('Total Items'),
    },
    {
      title: 'Available',
      value: metrics?.items.available || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-gradient-to-br from-green-50 to-green-100',
      iconBg: 'bg-green-600',
      trend: 'up',
      onClick: () => handleCardClick('Available'),
    },
    {
      title: 'Missing',
      value: metrics?.items.missing || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-gradient-to-br from-red-50 to-red-100',
      iconBg: 'bg-red-600',
      trend: 'down',
      onClick: () => handleCardClick('Missing'),
    },
    {
      title: 'Active Issues',
      value: metrics?.issues.active || 0,
      icon: ClipboardList,
      color: 'text-orange-600',
      bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100',
      iconBg: 'bg-orange-600',
      trend: null,
      onClick: () => handleCardClick('Active Issues'),
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Dashboard</h1>
            <p className="text-secondary-600">Plan, prioritize, and manage your QC items with ease.</p>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/items">
              <Button variant="outline" className="shadow-sm">
                View All Items
              </Button>
            </Link>
            <Link href="/reports">
              <Button className="shadow-md">
                View Reports
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden cursor-pointer"
                  onClick={stat.onClick}
                >
                  <CardContent className="p-6 relative">
                    <div className={`${stat.bgColor} absolute inset-0 opacity-50`} />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`${stat.iconBg} p-3 rounded-xl shadow-lg`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        {stat.trend && (
                          <div className={`flex items-center space-x-1 ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {stat.trend === 'up' ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-secondary-600 mb-1">
                          {stat.title}
                        </p>
                        <p className="text-4xl font-bold text-text">
                          {stat.value}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Items table (shown when Available or Total Items is clicked) */}
        {(tableView === 'available' || tableView === 'total') && (
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b border-secondary-200">
              <CardTitle className="text-xl font-bold text-text">
                {tableView === 'available' ? 'Available Items' : 'Total Items (Available & Missing)'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {tableLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                  <p className="mt-4 text-secondary-600">Loading...</p>
                </div>
              ) : tableData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-secondary-200 bg-secondary-50/50">
                        <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                          Item Code
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                          Item Category
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                          Item Name
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">
                          Serial Number
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700 w-[60px]">
                          Image
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((item, index) => (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="border-b border-secondary-100 hover:bg-secondary-50 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono text-sm">
                            {item.itemCode}
                          </td>
                          <td className="py-3 px-4 text-sm text-secondary-600">
                            {item.categoryId != null ? categoryMap[item.categoryId] ?? '—' : '—'}
                          </td>
                          <td className="py-3 px-4 font-medium text-text">
                            {item.itemName}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.status === 'AVAILABLE'
                                  ? 'bg-green-100 text-green-700 border border-green-200'
                                  : item.status === 'MISSING'
                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                    : 'bg-secondary-100 text-secondary-700 border border-secondary-200'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-secondary-600 font-mono">
                            {item.serialNumber ?? '—'}
                          </td>
                          <td className="py-3 px-4">
                            {item.image ? (
                              <img
                                src={`${API_BASE_URL}/storage/${item.image}`}
                                alt=""
                                width={30}
                                height={30}
                                className="min-w-[30px] min-h-[30px] w-[30px] h-[30px] object-cover rounded border border-secondary-200"
                              />
                            ) : (
                              <span className="inline-block min-w-[30px] min-h-[30px] w-[30px] h-[30px] rounded border border-secondary-200 bg-secondary-100 text-secondary-400 text-xs flex items-center justify-center">
                                —
                              </span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-secondary-500">
                    {tableView === 'available' ? 'No available items.' : 'No items with Available or Missing status.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
