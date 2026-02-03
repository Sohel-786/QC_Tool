'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { User, RolePermission } from '@/types';
import { SoftwareProfileDraftProvider } from '@/contexts/software-profile-draft-context';
import { useCurrentUserPermissions } from '@/hooks/use-settings';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HorizontalNav } from '@/components/layout/horizontal-nav';

const SIDEBAR_WIDTH_EXPANDED = 256;
const SIDEBAR_WIDTH_COLLAPSED = 64;

// Map route prefixes to required permission keys in RolePermission
const ROUTE_PERMISSIONS: Record<string, keyof RolePermission> = {
  '/dashboard': 'viewDashboard',
  '/companies': 'viewMaster',
  '/locations': 'viewMaster',
  '/contractors': 'viewMaster',
  '/statuses': 'viewMaster',
  '/machines': 'viewMaster',
  '/items': 'viewMaster',
  '/item-categories': 'viewMaster',
  '/users': 'viewMaster',
  '/issues': 'viewOutward',
  '/returns': 'viewInward',
  '/reports': 'viewReports',
  '/settings': 'accessSettings',
};

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const sidebarWidth = sidebarExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;

  const { data: permissions, isLoading: permissionsLoading } = useCurrentUserPermissions(
    pathname !== '/login' && !loading && !!user
  );

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

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

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

  if (loading || (permissionsLoading && pathname !== '/login')) {
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

  // Check permissions
  let hasPermission = true;
  if (permissions) {
    // Check if the current path matches any protected route
    // We check if pathname STARTS with the route key (to handle sub-routes like /items/new)
    const requiredPermissionKey = Object.keys(ROUTE_PERMISSIONS).find(route =>
      pathname === route || pathname.startsWith(`${route}/`)
    );

    if (requiredPermissionKey) {
      const permissionProp = ROUTE_PERMISSIONS[requiredPermissionKey];
      // If permission is strictly false (it might be undefined if not loaded yet, but we handle loading state), block access
      if (permissions[permissionProp] === false) {
        hasPermission = false;
      }
    }
  }

  if (!hasPermission) {
    return (
      <SoftwareProfileDraftProvider>
        <div className="min-h-screen bg-secondary-50">
          {permissions?.navigationLayout !== 'HORIZONTAL' && (
            <Sidebar
              userRole={user.role}
              currentUser={user}
              expanded={sidebarExpanded}
              onExpandChange={setSidebarExpanded}
              sidebarWidth={sidebarWidth}
            />
          )}
          <div
            className="transition-[margin] duration-200 ease-in-out relative z-0"
            style={{ marginLeft: permissions?.navigationLayout === 'HORIZONTAL' ? 0 : sidebarWidth }}
          >
            <Header user={user} />
            {permissions?.navigationLayout === 'HORIZONTAL' && <HorizontalNav />}
            <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
              <div className="text-center max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg border border-red-100">
                <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 mb-6">
                  You do not have permission to view this page. Please contact your administrator if you believe this is an error.
                </p>
                <Button onClick={() => router.push('/dashboard')} variant="outline" className="w-full">
                  Return to Dashboard
                </Button>
              </div>
            </main>
          </div>
        </div>
      </SoftwareProfileDraftProvider>
    );
  }

  return (
    <SoftwareProfileDraftProvider>
      <div className="min-h-screen bg-secondary-50">
        {permissions?.navigationLayout !== 'HORIZONTAL' && (
          <Sidebar
            userRole={user.role}
            currentUser={user}
            expanded={sidebarExpanded}
            onExpandChange={setSidebarExpanded}
            sidebarWidth={sidebarWidth}
          />
        )}
        <div
          className="transition-[margin] duration-200 ease-in-out relative z-0"
          style={{ marginLeft: permissions?.navigationLayout === 'HORIZONTAL' ? 0 : sidebarWidth }}
        >
          <Header user={user} />
          {permissions?.navigationLayout === 'HORIZONTAL' && <HorizontalNav />}
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </div>
      </div>
    </SoftwareProfileDraftProvider>
  );
}
