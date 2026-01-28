'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Role } from '@/types';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Redirect based on user role
        if (user.role === Role.QC_MANAGER) {
          router.push('/dashboard');
        } else {
          router.push('/tools');
        }
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return null;
}
