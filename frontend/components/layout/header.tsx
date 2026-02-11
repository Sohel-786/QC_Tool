'use client';

import { User } from '@/types';
import { Avatar } from '@/components/ui/avatar';
import { useAppSettings, useCurrentUserPermissions } from '@/hooks/use-settings';
import { useSoftwareProfileDraft } from '@/contexts/software-profile-draft-context';
import { Building2, ChevronDown, ChevronUp, LogOut } from 'lucide-react';
import { useLogout } from '@/hooks/use-auth-mutations';
import { Button } from '@/components/ui/button';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface HeaderProps {
  user: User;
  isNavExpanded: boolean;
  onNavExpandChange: (expanded: boolean) => void;
}

export function Header({ user, isNavExpanded, onNavExpandChange }: HeaderProps) {
  const { data: appSettings } = useAppSettings();
  const { data: permissions } = useCurrentUserPermissions();
  const profileDraft = useSoftwareProfileDraft()?.draft ?? null;
  const logoUrl =
    profileDraft?.logoUrl ??
    (appSettings?.companyLogo ? `${API_BASE}/storage/${appSettings.companyLogo}` : null);
  const hasLogo = Boolean(logoUrl);

  const isHorizontal = permissions?.navigationLayout === 'HORIZONTAL';

  const logoutMutation = useLogout();
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header
      className={`bg-white border-b border-secondary-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 shadow-sm ${isHorizontal
        ? 'h-14 py-1'
        : hasLogo ? 'min-h-[5.5rem] py-2' : 'h-16'
        }`}
    >
      <div className="flex items-center min-w-0 shrink-0">
        {hasLogo ? (
          <div className="flex items-center shrink-0 mr-5 bg-transparent">
            <img
              src={logoUrl!}
              alt=""
              className={isHorizontal
                ? "max-w-[60px] max-h-[48px] w-auto h-auto object-contain object-center"
                : "max-w-[80px] max-h-[70px] w-auto h-auto object-contain object-center"
              }
            />
          </div>
        ) : (
          <div className={`flex items-center justify-center shrink-0 text-primary-600 mr-5 ${isHorizontal ? 'w-[48px] h-[48px]' : 'w-[70px] h-[70px]'
            }`}>
            <Building2 className={isHorizontal ? "h-6 w-6" : "h-9 w-9"} />
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 min-w-0">
        {isHorizontal && (
          <button
            onClick={() => onNavExpandChange(!isNavExpanded)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-secondary-600 hover:bg-secondary-50 hover:text-primary-600 transition-all font-medium border border-secondary-200 shadow-sm"
          >
            {isNavExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span className="text-sm">Hide</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span className="text-sm">Show</span>
              </>
            )}
          </button>
        )}
        <div className="flex items-center gap-3">
          <Avatar user={user} size={isHorizontal ? "sm" : "md"} showName={false} />
          <div className="flex flex-col justify-center min-w-0">
            <span className={`font-semibold text-secondary-900 truncate ${isHorizontal ? 'text-xs' : 'text-sm'
              }`}>
              {user.firstName} {user.lastName}
            </span>
            <span className={`text-secondary-500 truncate ${isHorizontal ? 'text-[10px]' : 'text-xs'
              }`}>
              {user.username}
            </span>
          </div>
        </div>
        {isHorizontal && (
          <div className="border-l border-secondary-200 pl-4 ml-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-secondary-600 hover:text-red-600 hover:bg-red-50 flex items-center gap-2 px-3 h-9 rounded-lg transition-all duration-200 font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
