'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import { Division } from '@/types';

export function useDivisions() {
    return useQuery({
        queryKey: ['divisions'],
        queryFn: async (): Promise<Division[]> => {
            const response = await api.get('/divisions');
            return response.data.data;
        },
    });
}

export function useCreateDivision() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { name: string; isActive?: boolean }): Promise<Division> => {
            const response = await api.post('/divisions', data);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['divisions'] });
            toast.success('Division created successfully');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to create division';
            toast.error(message);
        },
    });
}

export function useUpdateDivision() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: { name?: string; isActive?: boolean } }): Promise<Division> => {
            const response = await api.patch(`/divisions/${id}`, data);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['divisions'] });
            toast.success('Division updated successfully');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to update division';
            toast.error(message);
        },
    });
}

export function useDeleteDivision() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number): Promise<void> => {
            await api.delete(`/divisions/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['divisions'] });
            toast.success('Division deleted successfully');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Failed to delete division';
            toast.error(message);
        },
    });
}
