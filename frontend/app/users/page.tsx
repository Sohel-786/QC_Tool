'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Role } from '@/types';
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
import { useUsers, useCreateUser, useUpdateUser } from '@/hooks/use-users';

const userSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.nativeEnum(Role),
  isActive: z.boolean().optional(),
});

type UserForm = z.infer<typeof userSchema>;

export default function UsersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { data: users } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: Role.QC_USER,
    },
  });

  const handleOpenForm = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setValue('username', user.username);
      setValue('firstName', user.firstName);
      setValue('lastName', user.lastName);
      setValue('role', user.role);
      setValue('isActive', user.isActive);
      // Don't set password for editing
    } else {
      setEditingUser(null);
      reset();
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
    reset();
  };

  const onSubmit = (data: UserForm) => {
    if (editingUser) {
      // For updates, only send password if it's provided
      const updateData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        isActive: data.isActive,
      };
      if (data.password && data.password.length > 0) {
        updateData.password = data.password;
      }
      updateUser.mutate(
        { id: editingUser.id, data: updateData },
        {
          onSuccess: () => {
            handleCloseForm();
          },
        }
      );
    } else {
      createUser.mutate(data, {
        onSuccess: () => {
          handleCloseForm();
        },
      });
    }
  };

  const filteredUsers = users?.filter((user) =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-3xl font-bold text-text mb-2">User Management</h1>
            <p className="text-secondary-600">Manage system users</p>
          </div>
          <Button onClick={() => handleOpenForm()} className="shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Search */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
              <Input
                placeholder="Search users by name or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>All Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUsers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-5 border border-secondary-200 rounded-lg hover:shadow-lg transition-all bg-white group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-text mb-1">
                          {user.firstName} {user.lastName}
                        </h3>
                        <p className="text-sm text-secondary-600 mb-1">{user.username}</p>
                        <p className="text-xs text-secondary-500">
                          {user.role.replace('_', ' ')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenForm(user)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-secondary-500 text-lg">
                  {searchTerm ? 'No users found matching your search.' : 'No users found. Add your first user above.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title={editingUser ? 'Update User' : 'Add New User'}
          size="md"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" {...register('firstName')} className="mt-1" />
                {errors.firstName && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" {...register('lastName')} className="mt-1" />
                {errors.lastName && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                type="text"
                {...register('username')}
                disabled={!!editingUser}
                className="mt-1"
              />
              {errors.username && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.username.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="password">
                Password {editingUser ? '(Leave empty to keep current)' : '*'}
              </Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                className="mt-1"
              />
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="role">Role *</Label>
              <Select id="role" {...register('role')} className="mt-1">
                <option value={Role.QC_USER}>QC User</option>
                <option value={Role.QC_MANAGER}>QC Manager</option>
              </Select>
            </div>
            {editingUser && (
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
                disabled={createUser.isPending || updateUser.isPending}
                className="flex-1"
              >
                {createUser.isPending || updateUser.isPending
                  ? 'Saving...'
                  : editingUser
                  ? 'Update User'
                  : 'Create User'}
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
