'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { User, UserPermission } from '@/types';
import { SoftwareProfileDraftProvider } from '@/contexts/software-profile-draft-context';
import { useCurrentUserPermissions } from '@/hooks/use-settings';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HorizontalNav } from '@/components/layout/horizontal-nav';
import { DivisionSelectionDialog } from '@/components/auth/division-selection-dialog';

const SIDEBAR_WIDTH_EXPANDED = 256;
const SIDEBAR_WIDTH_COLLAPSED = 64;

// Map route prefixes to required permission keys in UserPermission
const ROUTE_PERMISSIONS: Record<string, keyof UserPermission> = {
  '/dashboard': 'viewDashboard',
  '/companies': 'viewMaster',
  '/locations': 'viewMaster',
  '/contractors': 'viewMaster',
  '/statuses': 'viewMaster',
  '/machines': 'viewMaster',
  '/items': 'viewMaster',
  '/item-categories': 'viewMaster',
  '/divisions': 'viewDivisionMaster',
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
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [navExpanded, setNavExpanded] = useState(true);
  const sidebarWidth = sidebarExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;

  const { data: permissions, isLoading: permissionsLoading } = useCurrentUserPermissions(
    pathname !== '/login' && !loading && !!user
  );

  const queryClient = useQueryClient();
  const [hasSelectedDivision, setHasSelectedDivision] = useState<boolean>(false);
  const [isDivisionDialogOpen, setIsDivisionDialogOpen] = useState<boolean>(false);
  const [remountKey, setRemountKey] = useState(0);

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

  // Update hasSelectedDivision state from localStorage
  useEffect(() => {
    const checkDivision = () => {
      setHasSelectedDivision(!!localStorage.getItem('selectedDivisionId'));
    };
    checkDivision();
    // Also listen for changes
    window.addEventListener('storage', checkDivision);
    return () => window.removeEventListener('storage', checkDivision);
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const validateAndGetUser = async () => {
      if (pathname === '/login') {
        setLoading(false);
        return;
      }

      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem('user');
        }
      }

      try {
        // Always validate with backend if not on login page
        const response = await api.post('/auth/validate');
        if (response.data.user) {
          const fetchedUser = response.data.user;

          // Merge persistent division selection ONLY if valid for this user
          const persistentId = localStorage.getItem('selectedDivisionId');
          const persistentName = localStorage.getItem('selectedDivisionName');

          let validDivisionId: number | undefined = undefined;
          let validDivisionName: string | undefined = undefined;

          if (persistentId) {
            const pid = parseInt(persistentId);
            const userHasAccess = fetchedUser.allowedDivisions?.some((d: any) => d.id === pid);

            if (userHasAccess) {
              validDivisionId = pid;
              validDivisionName = persistentName || undefined;
            } else {
              // Invalid for this user -> clear storage
              localStorage.removeItem('selectedDivisionId');
              localStorage.removeItem('selectedDivisionName');
              setHasSelectedDivision(false);
            }
          }

          const userWithDivision = {
            ...fetchedUser,
            divisionId: validDivisionId || fetchedUser.divisionId,
            selectedDivisionName: validDivisionName || fetchedUser.selectedDivisionName
          };

          setUser(userWithDivision);
          localStorage.setItem('user', JSON.stringify(userWithDivision));

          // Sync hasSelectedDivision state
          setHasSelectedDivision(!!validDivisionId);
        }
      } catch (err) {
        // If validation fails, clear and redirect only if not on public routes
        localStorage.removeItem('user');
        localStorage.removeItem('selectedDivisionId');
        localStorage.removeItem('selectedDivisionName');
        setUser(null);
        router.push('/login');
      } finally {
        setLoading(false);
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


  const handleDivisionSelect = (divisionId: number, divisionName: string) => {
    if (!user) return;

    // 1. Check if the selection actually changed
    const currentId = localStorage.getItem('selectedDivisionId');
    if (currentId === divisionId.toString()) {
      setIsDivisionDialogOpen(false);
      return;
    }

    // 2. Update localStorage
    localStorage.setItem('selectedDivisionId', divisionId.toString());
    localStorage.setItem('selectedDivisionName', divisionName);

    const updatedUser = { ...user, divisionId, selectedDivisionName: divisionName };
    localStorage.setItem('user', JSON.stringify(updatedUser));

    // 2. Update local state
    setUser(updatedUser);
    setHasSelectedDivision(true);
    setIsDivisionDialogOpen(false);

    // 3. Clear ALL TanStack Query caches to ensure NO stale data remains
    // This is more robust than selective invalidation when swapping entire context
    queryClient.clear();

    // 4. Trigger storage event for other tabs
    window.dispatchEvent(new Event('storage'));

    // 5. Increment key to force React to remount the entire dashboard/page tree
    // This ensures all hooks and local states are truly reset for the new division
    setRemountKey(prev => prev + 1);
  };

  // NEW: Block access until division is selected
  if (!hasSelectedDivision && user) {
    // If user has NO divisions assigned, show a professional error state
    if (!user.allowedDivisions || user.allowedDivisions.length === 0) {
      return (
        <SoftwareProfileDraftProvider>
          <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-12 text-center border border-red-100 flex flex-col items-center">
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-8">
                <ShieldAlert className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-secondary-900 mb-3 px-2">No Division Assigned</h2>
              <p className="text-secondary-600 mb-8 leading-relaxed">
                Your account hasn't been assigned to any divisions yet. Please contact your administrator to get access.
              </p>
              <Button
                size="lg"
                onClick={() => {
                  localStorage.removeItem('user');
                  router.push('/login');
                }}
                className="w-full h-14 rounded-2xl bg-secondary-900 hover:bg-secondary-800 text-white font-bold transition-all shadow-lg active:scale-[0.98]"
              >
                Return to Login
              </Button>
            </div>
          </div>
        </SoftwareProfileDraftProvider>
      );
    }

    // Otherwise, show the selection dialog (centered, mandated)
    return (
      <SoftwareProfileDraftProvider>
        <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4">
          <DivisionSelectionDialog
            user={user}
            isOpen={true}
            onSelect={handleDivisionSelect}
            closable={false}
          />
        </div>
      </SoftwareProfileDraftProvider>
    );
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
            className="transition-[margin] duration-200 ease-in-out relative z-0 flex flex-col min-h-screen"
            style={{ marginLeft: permissions?.navigationLayout === 'HORIZONTAL' ? 0 : sidebarWidth }}
          >
            <Header
              user={user}
              isNavExpanded={navExpanded}
              onNavExpandChange={setNavExpanded}
              onOpenDivisionDialog={() => setIsDivisionDialogOpen(true)}
            />
            {permissions?.navigationLayout === 'HORIZONTAL' && (
              <HorizontalNav isExpanded={navExpanded} />
            )}
            <main className="flex-1 flex items-center justify-center p-6">
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
          className="transition-[margin] duration-200 ease-in-out relative z-0 flex flex-col min-h-screen"
          style={{ marginLeft: permissions?.navigationLayout === 'HORIZONTAL' ? 0 : sidebarWidth }}
        >
          <Header
            user={user}
            isNavExpanded={navExpanded}
            onNavExpandChange={setNavExpanded}
            onOpenDivisionDialog={() => setIsDivisionDialogOpen(true)}
          />
          {permissions?.navigationLayout === 'HORIZONTAL' && (
            <HorizontalNav isExpanded={navExpanded} />
          )}
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
      <DivisionSelectionDialog
        user={user}
        onSelect={handleDivisionSelect}
        isOpen={isDivisionDialogOpen}
        onClose={() => setIsDivisionDialogOpen(false)}
        closable={true}
      />
    </SoftwareProfileDraftProvider>
  );
}
