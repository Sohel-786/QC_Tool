'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { Division, Role } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2, Search } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';

const divisionSchema = z.object({
  code: z.string().min(1, 'Division code is required'),
  name: z.string().min(1, 'Division name is required'),
  isActive: z.boolean().optional(),
});

type DivisionForm = z.infer<typeof divisionSchema>;

export default function DivisionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();
  const isManager = currentUser?.role === Role.QC_MANAGER;

  const { data: divisions } = useQuery<Division[]>({
    queryKey: ['divisions'],
    queryFn: async () => {
      const response = await api.get('/divisions');
      return response.data?.data || [];
    },
  });

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<DivisionForm>({
    resolver: zodResolver(divisionSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: DivisionForm) => {
      const response = await api.post('/divisions', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
      handleCloseForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DivisionForm }) => {
      const response = await api.patch(`/divisions/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
      handleCloseForm();
    },
  });

  const handleOpenForm = (division?: Division) => {
    if (division) {
      setEditingDivision(division);
      setValue('code', division.code);
      setValue('name', division.name);
      setValue('isActive', division.isActive);
    } else {
      setEditingDivision(null);
      reset();
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingDivision(null);
    reset();
  };

  const onSubmit = (data: DivisionForm) => {
    if (editingDivision) {
      updateMutation.mutate({ id: editingDivision.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredDivisions = divisions?.filter((division) =>
    division.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    division.code.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-3xl font-bold text-text mb-2">Divisions</h1>
            <p className="text-secondary-600">Manage company divisions</p>
          </div>
          <Button onClick={() => handleOpenForm()} className="shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            Add Division
          </Button>
        </div>

        {/* Search */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
              <Input
                placeholder="Search divisions by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Divisions List */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>All Divisions ({filteredDivisions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredDivisions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDivisions.map((division, index) => (
                  <motion.div
                    key={division.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-5 border border-secondary-200 rounded-lg hover:shadow-lg transition-all bg-white group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-text mb-1">{division.name}</h3>
                        <p className="text-sm text-secondary-600 font-mono">
                          {division.code}
                        </p>
                      </div>
                      {!isManager && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenForm(division)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          division.isActive
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}
                      >
                        {division.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-secondary-500 text-lg">
                  {searchTerm ? 'No divisions found matching your search.' : 'No divisions found. Add your first division above.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title={editingDivision ? 'Update Division' : 'Add New Division'}
          size="md"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="code">Division Code *</Label>
              <Input
                id="code"
                {...register('code')}
                placeholder="DIV-001"
                disabled={!!editingDivision}
                className="mt-1"
              />
              {errors.code && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.code.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="name">Division Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Production Division"
                className="mt-1"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            {editingDivision && (
              <div>
                <Label htmlFor="isActive" className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="isActive"
                    {...register('isActive')}
                    className="rounded w-4 h-4 text-primary-600 focus:ring-primary-500 border-secondary-300"
                  />
                  <span>Active</span>
                </Label>
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
                  : editingDivision
                  ? 'Update Division'
                  : 'Create Division'}
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
