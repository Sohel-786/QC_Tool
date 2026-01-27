'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import { User } from '@/types';

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
        router.push('/dashboard');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
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
      localStorage.removeItem('user');
      queryClient.clear();
      toast.success('Logged out successfully');
      router.push('/login');
    },
    onError: () => {
      // Even if logout fails, clear local state
      localStorage.removeItem('user');
      queryClient.clear();
      router.push('/login');
    },
  });
}
