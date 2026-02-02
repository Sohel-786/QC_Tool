'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import { User, Role } from '@/types';

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

        // Redirect based on user role
        // Small delay to ensure localStorage is set and cookie is available
        setTimeout(() => {
          const redirectPath = data.user.role === Role.QC_MANAGER ? '/dashboard' : '/items';
          router.push(redirectPath);
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
