'use client';

import React from 'react';
import { Search, Bell, User, Menu } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  pageTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, pageTitle = 'Dashboard' }) => {
  const { user } = useAuth();

  return (
    <header className="h-20 px-6 flex items-center justify-between glass-panel border-b border-white/10 dark:border-white/10 sticky top-0 z-30 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-white dark:hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <h1 className="text-xl font-bold text-gray-100 dark:text-white tracking-tight">{pageTitle}</h1>
          <p className="text-xs text-gray-400 hidden sm:block">Luckydental Patient Portal</p>
        </div>
      </div>

      {/* Quick Search & Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative hidden md:block w-56 lg:w-64">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Quick search..."
            className="w-full glass-input text-xs rounded-xl pl-10 pr-4 py-2 text-gray-200 placeholder:text-gray-500"
          />
        </div>

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Admin Profile Chip */}
        <div className="flex items-center gap-3 pl-2 border-l border-white/10 dark:border-white/10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-950 border border-red-500/40 flex items-center justify-center text-white shadow-glow-red-sm">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-gray-200 dark:text-gray-100 leading-tight">{user?.name || 'Administrator'}</p>
            <p className="text-[10px] text-gray-400 leading-tight">{user?.email || 'admin@luckydental.com'}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
