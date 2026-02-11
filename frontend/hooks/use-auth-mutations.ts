'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import { User, Role, UserPermission } from '@/types';

interface LoginData {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  user: User;
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LoginData): Promise<LoginResponse> => {
      const response = await api.post('/auth/login', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        queryClient.setQueryData(['user'], data.user);
        toast.success('Login successful!');

        // Redirect based on user permissions
        // Small delay to ensure localStorage is set and cookie is available
        setTimeout(async () => {
          try {
            // Admin always goes to dashboard
            if (data.user.role === Role.QC_ADMIN) {
              router.push('/dashboard');
              return;
            }

            // Fetch permissions to determine dynamic redirect
            const permRes = await api.get('/settings/permissions/me');
            const perms = permRes.data.data as UserPermission;

            let redirectPath = '/dashboard'; // Default fallback

            if (perms) {
              if (perms.viewDashboard) {
                redirectPath = '/dashboard';
              } else if (perms.viewMaster) {
                // Check master modules in order
                if (perms.viewCompanyMaster) redirectPath = '/companies';
                else if (perms.viewLocationMaster) redirectPath = '/locations';
                else if (perms.viewContractorMaster) redirectPath = '/contractors';
                else if (perms.viewMachineMaster) redirectPath = '/machines';
                else if (perms.viewItemCategoryMaster) redirectPath = '/item-categories';
                else if (perms.viewItemMaster) redirectPath = '/items';
                else if (perms.viewStatusMaster) redirectPath = '/statuses';
                else redirectPath = '/items'; // Fallback if viewMaster is true but no specific view (edge case)
              } else if (perms.viewOutward) {
                redirectPath = '/issues';
              } else if (perms.viewInward) {
                redirectPath = '/returns';
              } else if (perms.viewReports) {
                redirectPath = '/reports';
              } else if (perms.accessSettings) {
                redirectPath = '/settings';
              }
            }

            router.push(redirectPath);
          } catch (error) {
            console.error('Failed to fetch permissions for redirect:', error);
            // Fallback to dashboard or items if permission fetch fails
            router.push('/dashboard');
          }
        }, 150);
      }
    },
    onError: (error: any) => {
      const status = error.response?.status;
      const backendMessage = error.response?.data?.message;

      const message =
        status === 401
          ? 'Invalid username or password. Please check your credentials and try again.'
          : backendMessage || 'Login failed. Please try again.';

      toast.error(message);
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      // Clear all local storage
      localStorage.removeItem('user');
      // Clear all query cache
      queryClient.clear();
      toast.success('Logged out successfully');
      // Use window.location for full page reload to ensure cookies are cleared
      window.location.href = '/login';
    },
    onError: () => {
      // Even if logout fails, clear local state and cache
      localStorage.removeItem('user');
      queryClient.clear();
      // Force full page reload to clear cookies
      window.location.href = '/login';
    },
  });
}
