'use client';

import { User } from '@/types';

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-secondary-200 flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-text">Welcome back, {user.firstName}!</h2>
      </div>
      <div className="flex items-center space-x-4">
        <div className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium">
          {user.role.replace('_', ' ')}
        </div>
      </div>
    </header>
  );
}
