'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { Tool, ToolStatus, Role } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2, Search } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';

const toolSchema = z.object({
  toolCode: z.string().min(1, 'Tool code is required'),
  toolName: z.string().min(1, 'Tool name is required'),
  description: z.string().optional(),
  status: z.nativeEnum(ToolStatus).optional(),
});

type ToolForm = z.infer<typeof toolSchema>;

export default function ToolsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();
  const isManager = currentUser?.role === Role.QC_MANAGER;

  const { data: tools } = useQuery<Tool[]>({
    queryKey: ['tools'],
    queryFn: async () => {
      const response = await api.get('/tools');
      return response.data?.data || [];
    },
  });

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<ToolForm>({
    resolver: zodResolver(toolSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: ToolForm) => {
      const response = await api.post('/tools', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      handleCloseForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ToolForm }) => {
      const response = await api.patch(`/tools/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      handleCloseForm();
    },
  });

  const handleOpenForm = (tool?: Tool) => {
    if (tool) {
      setEditingTool(tool);
      setValue('toolCode', tool.toolCode);
      setValue('toolName', tool.toolName);
      setValue('description', tool.description || '');
      setValue('status', tool.status);
    } else {
      setEditingTool(null);
      reset();
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTool(null);
    reset();
  };

  const onSubmit = (data: ToolForm) => {
    if (editingTool) {
      updateMutation.mutate({ id: editingTool.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatusColor = (status: ToolStatus) => {
    switch (status) {
      case ToolStatus.AVAILABLE:
        return 'bg-green-100 text-green-700 border-green-200';
      case ToolStatus.ISSUED:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case ToolStatus.MISSING:
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-secondary-100 text-secondary-700 border-secondary-200';
    }
  };

  const filteredTools = tools?.filter((tool) =>
    tool.toolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.toolCode.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
            <h1 className="text-3xl font-bold text-text mb-2">QC Tools</h1>
            <p className="text-secondary-600">Manage your QC tools inventory</p>
          </div>
          <Button onClick={() => handleOpenForm()} className="shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            Add Tool
          </Button>
        </div>

        {/* Search */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
              <Input
                placeholder="Search tools by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tools List */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>All Tools ({filteredTools.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTools.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTools.map((tool, index) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-5 border border-secondary-200 rounded-lg hover:shadow-lg transition-all bg-white group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-text mb-1">{tool.toolName}</h3>
                        <p className="text-sm text-secondary-600 font-mono">
                          {tool.toolCode}
                        </p>
                      </div>
                      {!isManager && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenForm(tool)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {tool.description && (
                      <p className="text-sm text-secondary-500 mb-3 line-clamp-2">
                        {tool.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          tool.status,
                        )}`}
                      >
                        {tool.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-secondary-500 text-lg">
                  {searchTerm ? 'No tools found matching your search.' : 'No tools found. Add your first tool above.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title={editingTool ? 'Update Tool' : 'Add New Tool'}
          size="md"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="toolCode">Tool Code *</Label>
                <Input
                  id="toolCode"
                  {...register('toolCode')}
                  placeholder="TOOL-001"
                  disabled={!!editingTool}
                  className="mt-1"
                />
                {errors.toolCode && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.toolCode.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="toolName">Tool Name *</Label>
                <Input
                  id="toolName"
                  {...register('toolName')}
                  placeholder="Calibration Tool"
                  className="mt-1"
                />
                {errors.toolName && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.toolName.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                {...register('description')}
                placeholder="Optional description"
                className="mt-1"
              />
            </div>
            {editingTool && (
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  {...register('status')}
                  className="mt-1"
                >
                  <option value={ToolStatus.AVAILABLE}>Available</option>
                  <option value={ToolStatus.ISSUED}>Issued</option>
                  <option value={ToolStatus.MISSING}>Missing</option>
                </Select>
              </div>
            )}
            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingTool
                  ? 'Update Tool'
                  : 'Create Tool'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseForm}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Dialog>
      </motion.div>
    </div>
  );
}
