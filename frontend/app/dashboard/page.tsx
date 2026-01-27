'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { DashboardMetrics, Issue, Return } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Wrench,
  CheckCircle,
  XCircle,
  AlertCircle,
  ClipboardList,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    api
      .post('/auth/validate')
      .then(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      })
      .catch(() => {
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

  const { data: recentIssues } = useQuery<Issue[]>({
    queryKey: ['recent-issues'],
    queryFn: async () => {
      const response = await api.get('/dashboard/recent-issues?limit=5');
      return response.data.data || [];
    },
  });

  const { data: recentReturns } = useQuery<Return[]>({
    queryKey: ['recent-returns'],
    queryFn: async () => {
      const response = await api.get('/dashboard/recent-returns?limit=5');
      return response.data.data || [];
    },
  });

  const statCards = [
    {
      title: 'Total Tools',
      value: metrics?.tools.total || 0,
      icon: Wrench,
      color: 'text-primary-600',
      bgColor: 'bg-gradient-to-br from-primary-50 to-primary-100',
      iconBg: 'bg-primary-600',
      trend: null,
    },
    {
      title: 'Available',
      value: metrics?.tools.available || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-gradient-to-br from-green-50 to-green-100',
      iconBg: 'bg-green-600',
      trend: 'up',
    },
    {
      title: 'Issued',
      value: metrics?.tools.issued || 0,
      icon: ClipboardList,
      color: 'text-blue-600',
      bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
      iconBg: 'bg-blue-600',
      trend: null,
    },
    {
      title: 'Missing',
      value: metrics?.tools.missing || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-gradient-to-br from-red-50 to-red-100',
      iconBg: 'bg-red-600',
      trend: 'down',
    },
    {
      title: 'Active Issues',
      value: metrics?.issues.active || 0,
      icon: ClipboardList,
      color: 'text-orange-600',
      bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100',
      iconBg: 'bg-orange-600',
      trend: null,
    },
    {
      title: 'Total Returns',
      value: metrics?.returns.total || 0,
      icon: ArrowLeftRight,
      color: 'text-purple-600',
      bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100',
      iconBg: 'bg-purple-600',
      trend: 'up',
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
            <p className="text-secondary-600">Plan, prioritize, and manage your QC tools with ease.</p>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/tools">
              <Button variant="outline" className="shadow-sm">
                View All Tools
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden">
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

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Issues */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-text">Recent Issues</CardTitle>
                <Link href="/issues">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentIssues && recentIssues.length > 0 ? (
                <div className="divide-y divide-secondary-100">
                  {recentIssues.map((issue, index) => (
                    <motion.div
                      key={issue.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 hover:bg-secondary-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <ClipboardList className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-text">{issue.tool?.toolName}</p>
                              <p className="text-sm text-secondary-600">
                                {issue.issueNo} • {issue.division?.name}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-secondary-500 ml-13">
                            {formatDateTime(issue.issuedAt)}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            issue.isReturned
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {issue.isReturned ? 'Returned' : 'Active'}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ClipboardList className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
                  <p className="text-secondary-500">No recent issues</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Returns */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-text">Recent Returns</CardTitle>
                <Link href="/returns">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentReturns && recentReturns.length > 0 ? (
                <div className="divide-y divide-secondary-100">
                  {recentReturns.map((return_, index) => (
                    <motion.div
                      key={return_.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 hover:bg-secondary-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <ArrowLeftRight className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-text">
                                {return_.issue?.tool?.toolName}
                              </p>
                              <p className="text-sm text-secondary-600">
                                Issue: {return_.issue?.issueNo}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-secondary-500 ml-13">
                            {formatDateTime(return_.returnedAt)}
                          </p>
                        </div>
                        {return_.returnImage && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-secondary-200">
                            <img
                              src={`http://localhost:3001/storage/${return_.returnImage}`}
                              alt="Return"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ArrowLeftRight className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
                  <p className="text-secondary-500">No recent returns</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
