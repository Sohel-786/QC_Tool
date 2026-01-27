'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { Issue, Tool } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';

export default function ReportsPage() {
  const { data: issuedTools } = useQuery<Issue[]>({
    queryKey: ['issued-tools-report'],
    queryFn: async () => {
      const response = await api.get('/reports/issued-tools');
      return response.data?.data || [];
    },
  });

  const { data: missingTools } = useQuery<Tool[]>({
    queryKey: ['missing-tools-report'],
    queryFn: async () => {
      const response = await api.get('/reports/missing-tools');
      return response.data?.data || [];
    },
  });

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">Reports</h1>
          <p className="text-secondary-600">View system reports and analytics</p>
        </div>

        {/* Issued Tools Report */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Issued Tools Report ({issuedTools?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {issuedTools && Array.isArray(issuedTools) && issuedTools.length > 0 ? (
              <div className="space-y-4">
                {issuedTools.map((issue, index) => (
                  <motion.div
                    key={issue.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-5 border border-secondary-200 rounded-lg hover:shadow-md transition-all bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-text mb-2">{issue.tool?.toolName}</h3>
                        <div className="space-y-1">
                          <p className="text-sm text-secondary-600">
                            <span className="font-medium">Issue No:</span> {issue.issueNo}
                          </p>
                          <p className="text-sm text-secondary-600">
                            <span className="font-medium">Division:</span> {issue.division?.name}
                          </p>
                          <p className="text-xs text-secondary-500 mt-2">
                            {formatDateTime(issue.issuedAt)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-4 py-2 rounded-full text-sm font-medium ${
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
                <p className="text-secondary-500 text-lg">No issued tools found.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Missing Tools Report */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Missing Tools Report ({missingTools?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {missingTools && Array.isArray(missingTools) && missingTools.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {missingTools.map((tool, index) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-5 border border-red-200 bg-red-50 rounded-lg hover:shadow-md transition-all"
                  >
                    <h3 className="font-semibold text-lg text-red-900 mb-2">{tool.toolName}</h3>
                    <p className="text-sm text-red-700 font-mono">Code: {tool.toolCode}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-secondary-500 text-lg">No missing tools. Great job!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
