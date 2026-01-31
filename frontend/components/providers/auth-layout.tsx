'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { User } from '@/types';
import { SoftwareProfileDraftProvider } from '@/contexts/software-profile-draft-context';

const SIDEBAR_WIDTH_EXPANDED = 256;
const SIDEBAR_WIDTH_COLLAPSED = 64;

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const sidebarWidth = sidebarExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;

  // React to current user updates from Settings/User Management (without reload)
  useEffect(() => {
    const handleCurrentUserUpdated = (e: Event) => {
      setUser((e as CustomEvent<User>).detail);
    };
    window.addEventListener('currentUserUpdated', handleCurrentUserUpdated);
    return () => {
      window.removeEventListener('currentUserUpdated', handleCurrentUserUpdated);
    };
  }, []);

  useEffect(() => {
    const validateAndGetUser = async () => {
      // Skip auth check for login page
      if (pathname === '/login') {
        setLoading(false);
        return;
      }

      // First check localStorage for optimistic loading
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setLoading(false);
          
          // Validate in background (don't block UI)
          api.post('/auth/validate')
            .catch(() => {
              // If validation fails, clear user and redirect
              localStorage.removeItem('user');
              setUser(null);
              router.push('/login');
            });
        } catch {
          // Invalid user data in localStorage
          localStorage.removeItem('user');
          setUser(null);
          router.push('/login');
          setLoading(false);
        }
      } else {
        // No user in localStorage, validate with cookie
        try {
          await api.post('/auth/validate');
          // If validation succeeds but no user in localStorage, redirect to login
          router.push('/login');
        } catch {
          router.push('/login');
        } finally {
          setLoading(false);
        }
      }
    };

    validateAndGetUser();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't show layout on login page
  if (pathname === '/login' || !user) {
    return <>{children}</>;
  }

  return (
    <SoftwareProfileDraftProvider>
      <div className="min-h-screen bg-secondary-50">
        <Sidebar
          userRole={user.role}
          currentUser={user}
          expanded={sidebarExpanded}
          onExpandChange={setSidebarExpanded}
          sidebarWidth={sidebarWidth}
        />
        <div
          className="transition-[margin] duration-200 ease-in-out relative z-0"
          style={{ marginLeft: sidebarWidth }}
        >
          <Header user={user} />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </div>
      </div>
    </SoftwareProfileDraftProvider>
  );
}
