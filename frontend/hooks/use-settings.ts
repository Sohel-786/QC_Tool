'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import { AppSettings, RolePermission } from '@/types';

export function useAppSettings() {
  return useQuery({
    queryKey: ['settings', 'software'],
    queryFn: async (): Promise<AppSettings> => {
      const response = await api.get('/settings/software');
      return response.data.data;
    },
  });
}

export function useUpdateAppSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<AppSettings>): Promise<AppSettings> => {
      const response = await api.patch('/settings/software', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'software'] });
      toast.success('Software settings saved');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to save settings';
      toast.error(message);
    },
  });
}

export function useUploadCompanyLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<AppSettings> => {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await api.post('/settings/software/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'software'] });
      toast.success('Logo updated');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to upload logo';
      toast.error(message);
    },
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ['settings', 'permissions'],
    queryFn: async (): Promise<RolePermission[]> => {
      const response = await api.get('/settings/permissions');
      return response.data.data;
    },
  });
}

/** Current logged-in user's role permissions (from GET /settings/permissions/me). Use for view/add/edit checks on pages. */
export function useCurrentUserPermissions(enabled = true) {
  return useQuery({
    queryKey: ['settings', 'permissions', 'me'],
    queryFn: async (): Promise<RolePermission | null> => {
      const response = await api.get('/settings/permissions/me');
      return response.data.data ?? null;
    },
    retry: false,
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

export function useUpdatePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (permissions: RolePermission[]): Promise<RolePermission[]> => {
      const response = await api.patch('/settings/permissions', { permissions });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'permissions'] });
      toast.success('Access permissions saved');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to save permissions';
      toast.error(message);
    },
  });
}
