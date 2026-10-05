'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface AppHeaderProps {
  onOpenMobileMenu: () => void;
}

interface UserInfo {
  id: string;
  email: string;
  display_name: string;
}

export function AppHeader({ onOpenMobileMenu }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    router.push('/login');
    router.refresh();
  };

  const getPageTitle = () => {
    switch (pathname) {
      case '/app':
        return { title: 'Workspace Overview', section: 'Overview' };
      case '/app/datasets':
        return { title: 'Datasets', section: 'Data Platform' };
      case '/app/upload':
        return { title: 'Upload Dataset', section: 'Ingestion' };
      case '/app/dashboard':
        return { title: 'Dataset Dashboard', section: 'Analytics' };
      case '/app/chat':
        return { title: 'AI Data Chat', section: 'Intelligence' };
      case '/app/team':
        return { title: 'Team & Members', section: 'Governance' };
      case '/app/audit':
        return { title: 'Audit Trail', section: 'Governance' };
      default:
        return { title: 'TraceImpact Cloud', section: 'Workspace' };
    }
  };

  const { title, section } = getPageTitle();

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'TI';
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-[#090d16]/90 px-4 sm:px-6 md:px-8 backdrop-blur-md">
      {/* Left: Mobile trigger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Open sidebar navigation"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="hidden sm:inline-block font-medium">{section}</span>
          <span className="hidden sm:inline-block text-slate-600">/</span>
          <h1 className="text-sm font-semibold text-slate-100">{title}</h1>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {pathname !== '/app/upload' && (
          <Link href="/app/upload">
            <Button size="sm" variant="primary" className="hidden sm:inline-flex gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Dataset
            </Button>
          </Link>
        )}

        {/* User Pill & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600/30 border border-indigo-500/40 text-[10px] font-bold text-indigo-300">
              {getInitials(user?.display_name, user?.email)}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-medium text-slate-200 leading-tight">
                {user?.display_name || 'Admin User'}
              </span>
              <span className="text-[10px] text-slate-400 leading-tight">
                {user?.email || 'demo@traceimpact.com'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            aria-label="Log out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
