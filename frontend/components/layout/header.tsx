'use client';

import { User } from '@/types';
import { Avatar } from '@/components/ui/avatar';

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-secondary-200 flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm">
      <div>
        {/* Empty left side - can be used for breadcrumbs or page title in future */}
      </div>
      <div className="flex items-center space-x-4">
        <Avatar user={user} size="md" showName={true} />
      </div>
    </header>
  );
}
