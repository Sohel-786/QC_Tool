'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { DashboardMetrics, Issue, Return } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Wrench,
  CheckCircle,
  XCircle,
  AlertCircle,
  ClipboardList,
  ArrowLeftRight,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Validate token
    api
      .post('/auth/validate')
      .then(() => {
        // Get user from cookie or API
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
      bgColor: 'bg-primary-50',
    },
    {
      title: 'Available',
      value: metrics?.tools.available || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Issued',
      value: metrics?.tools.issued || 0,
      icon: ClipboardList,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Missing',
      value: metrics?.tools.missing || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Active Issues',
      value: metrics?.issues.active || 0,
      icon: ClipboardList,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Total Returns',
      value: metrics?.returns.total || 0,
      icon: ArrowLeftRight,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">Dashboard</h1>
          <p className="text-secondary-600">Overview of your QC Tool Management System</p>
        </div>

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
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-secondary-600 mb-1">
                          {stat.title}
                        </p>
                        <p className="text-3xl font-bold text-text">
                          {stat.value}
                        </p>
                      </div>
                      <div
                        className={`${stat.bgColor} ${stat.color} p-3 rounded-full`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentIssues?.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{issue.tool?.toolName}</p>
                      <p className="text-sm text-secondary-600">
                        {issue.issueNo} • {issue.division?.name}
                      </p>
                      <p className="text-xs text-secondary-500">
                        {formatDateTime(issue.issuedAt)}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        issue.isReturned
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {issue.isReturned ? 'Returned' : 'Active'}
                    </span>
                  </div>
                ))}
                {(!recentIssues || recentIssues.length === 0) && (
                  <p className="text-center text-secondary-500 py-4">
                    No recent issues
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentReturns?.map((return_) => (
                  <div
                    key={return_.id}
                    className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {return_.issue?.tool?.toolName}
                      </p>
                      <p className="text-sm text-secondary-600">
                        {return_.issue?.issueNo}
                      </p>
                      <p className="text-xs text-secondary-500">
                        {formatDateTime(return_.returnedAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {(!recentReturns || recentReturns.length === 0) && (
                  <p className="text-center text-secondary-500 py-4">
                    No recent returns
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
