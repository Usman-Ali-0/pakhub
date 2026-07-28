'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  Search, Bell, Plus, ChevronDown, Menu, X,
  BookOpen, GitPullRequest, AlertCircle, Star,
  Settings, LogOut, User, Moon, Sun, Monitor,
  GitBranch, Compass, MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { notificationsApi, searchApi } from '@/lib/api';
import { useNotificationStore } from '@/store/notification.store';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useTranslation } from '@/i18n/I18nProvider';

export function Navbar() {
  const { user, clearAuth } = useAuthStore();
  const { unreadCount, setUnreadCount } = useNotificationStore();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Initialize theme
  useEffect(() => {
    const saved = localStorage.getItem('pakhub-theme') as 'light' | 'dark' | 'system' | null;
    if (saved) {
      setTheme(saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('system');
    }
  }, []);

  // Apply theme
  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('pakhub-theme', newTheme);
    const doc = document.documentElement;
    doc.classList.add('transitioning');
    if (newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      doc.classList.add('dark');
    } else {
      doc.classList.remove('dark');
    }
    setTimeout(() => doc.classList.remove('transitioning'), 250);
  };

  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Fetch notifications
  useEffect(() => {
    if (user) {
      notificationsApi.list({ filter: 'unread' }).then((res: any) => {
        setNotifications(res.data?.slice(0, 5) || []);
        setUnreadCount(res.pagination?.total || res.data?.length || 0);
      }).catch(() => {});
    }
  }, [user, setUnreadCount]);

  // Search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults(null); return; }
    const timer = setTimeout(() => {
      searchApi.global(searchQuery).then(setSearchResults).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) setShowCreateMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowSearch(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    clearAuth();
    setShowUserMenu(false);
    router.push('/');
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
  };

  return (
    <header className="pakhub-header fixed top-0 left-0 right-0 z-50 h-14">
      <div className="max-w-screen-2xl mx-auto px-4 h-full flex items-center gap-4">
        {/* Logo */}
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 flex-shrink-0 group" id="nav-logo">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.66-.22.66-.48 0-.24-.01-1.02-.01-1.85-2.78.6-3.37-1.18-3.37-1.18-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0112 6.8c.85.004 1.71.115 2.51.337 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .27.16.58.67.48A10.012 10.012 0 0022 12c0-5.52-4.48-10-10-10z" fill="currentColor"/>
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:block">
            Pak<span className="text-emerald-400">Hub</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1 text-sm">
          {user && (
            <>
              <Link href="/search?type=pulls" className="px-3 py-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors" id="nav-pulls">
                {t.nav.pullRequests}
              </Link>
              <Link href="/search?type=issues" className="px-3 py-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors" id="nav-issues">
                {t.nav.issues}
              </Link>
            </>
          )}
          <Link href="/explore" className="px-3 py-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors" id="nav-explore">
            {t.nav.explore}
          </Link>
        </nav>

        {/* Search */}
        <div ref={searchRef} className="flex-1 max-w-xl relative">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                ref={searchInputRef}
                id="nav-search"
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                placeholder="Type / to search..."
                className="w-full pl-9 pr-10 py-1.5 rounded-md text-sm
                  bg-white/10 border border-white/20 text-white placeholder:text-white/40
                  focus:bg-white/15 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/20
                  transition-all"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 border border-white/20 rounded px-1.5 py-0.5 hidden sm:inline-block">/</kbd>
            </div>
          </form>

          {/* Search Dropdown */}
          {showSearch && searchResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 animate-slide-down">
              {searchResults.repos?.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">Repositories</div>
                  {searchResults.repos.slice(0, 4).map((r: any) => (
                    <Link key={r.id} href={`/${r.owner?.username || r.ownerUsername}/${r.name}`}
                      onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-200">
                      <BookOpen className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{r.owner?.username || r.ownerUsername}/{r.name}</span>
                    </Link>
                  ))}
                </div>
              )}
              {searchResults.users?.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">Users</div>
                  {searchResults.users.slice(0, 3).map((u: any) => (
                    <Link key={u.id} href={`/${u.username}`}
                      onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-200">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{u.username}</span>
                      {u.name && <span className="text-slate-400">— {u.name}</span>}
                    </Link>
                  ))}
                </div>
              )}
              <Link href={`/search?q=${encodeURIComponent(searchQuery)}`}
                onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-t border-slate-100 dark:border-slate-700 font-medium">
                <Search className="w-4 h-4" /> Search all of PakHub for "{searchQuery}"
              </Link>
            </div>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1.5">
          {/* Language switcher */}
          <LanguageSwitcher />

          {/* Theme toggle */}
          <button
            id="nav-theme-toggle"
            onClick={() => applyTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {user ? (
            <>
              {/* Notifications */}
              <div ref={notifRef} className="relative">
                <button
                  id="nav-notifications"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white ring-2 ring-[var(--header-bg)]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="dropdown-menu right-0 top-full mt-1 w-96 animate-slide-down">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</h3>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
                          Mark all as read
                        </button>
                      )}
                    </div>
                    {notifications.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.map((n: any) => (
                          <Link key={n.id} href={n.link || '#'}
                            onClick={() => setShowNotifications(false)}
                            className="dropdown-item py-3 items-start">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.isRead ? 'bg-transparent' : 'bg-blue-500'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{n.title}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{n.body}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                        All caught up!
                      </div>
                    )}
                    <Link href="/notifications"
                      onClick={() => setShowNotifications(false)}
                      className="block px-4 py-2.5 text-xs text-center text-emerald-600 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-700 border-t border-slate-100 dark:border-slate-700 font-medium">
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>

              {/* Create new */}
              <div ref={createMenuRef} className="relative">
                <button
                  id="nav-create"
                  onClick={() => setShowCreateMenu(!showCreateMenu)}
                  className="flex items-center gap-0.5 p-2 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showCreateMenu && (
                  <div className="dropdown-menu right-0 top-full mt-1 w-56 animate-slide-down">
                    <Link href="/new" onClick={() => setShowCreateMenu(false)} className="dropdown-item">
                      <BookOpen className="w-4 h-4 text-slate-400" /> {t.nav.newRepo}
                    </Link>
                    <div className="dropdown-divider" />
                    <Link href="/import" onClick={() => setShowCreateMenu(false)} className="dropdown-item">
                      <GitBranch className="w-4 h-4 text-slate-400" /> {t.nav.importRepo}
                    </Link>
                    <Link href="/ai/chat" onClick={() => setShowCreateMenu(false)} className="dropdown-item">
                      <MessageSquare className="w-4 h-4 text-slate-400" /> {t.ai.chat}
                    </Link>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div ref={userMenuRef} className="relative">
                <button
                  id="nav-user-menu"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-white/20 transition-all ml-1"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold ring-2 ring-white/10">
                    {user.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="dropdown-menu right-0 top-full mt-1 w-64 animate-slide-down">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.name || user.username}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">@{user.username}</p>
                    </div>
                    <Link href={`/${user.username}`} onClick={() => setShowUserMenu(false)} className="dropdown-item mt-1">
                      <User className="w-4 h-4 text-slate-400" /> {t.nav.yourProfile}
                    </Link>
                    <Link href={`/${user.username}?tab=repositories`} onClick={() => setShowUserMenu(false)} className="dropdown-item">
                      <BookOpen className="w-4 h-4 text-slate-400" /> {t.nav.yourRepos}
                    </Link>
                    <Link href={`/${user.username}?tab=stars`} onClick={() => setShowUserMenu(false)} className="dropdown-item">
                      <Star className="w-4 h-4 text-slate-400" /> {t.nav.yourStars}
                    </Link>
                    <div className="dropdown-divider" />
                    <Link href="/settings/profile" onClick={() => setShowUserMenu(false)} className="dropdown-item">
                      <Settings className="w-4 h-4 text-slate-400" /> {t.nav.settings}
                    </Link>
                    <Link href="/settings/ai" onClick={() => setShowUserMenu(false)} className="dropdown-item">
                      <MessageSquare className="w-4 h-4 text-slate-400" /> {t.nav.aiProviders}
                    </Link>
                    <div className="dropdown-divider" />
                    <button onClick={handleLogout} className="dropdown-item text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full">
                      <LogOut className="w-4 h-4" /> {t.nav.signOut}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Link href="/login" id="nav-signin" className="px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors">
                {t.nav.signIn}
              </Link>
              <Link href="/register" id="nav-signup" className="px-4 py-1.5 text-sm font-medium bg-white/10 text-white border border-white/20 rounded-md hover:bg-white/20 transition-colors">
                {t.nav.signUp}
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden p-2 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="lg:hidden bg-[var(--header-bg)] border-t border-white/10 animate-slide-down">
          <nav className="px-4 py-3 space-y-1">
            <Link href="/explore" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-2 px-3 py-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 text-sm">
              <Compass className="w-4 h-4" /> Explore
            </Link>
            {user && (
              <>
                <Link href="/search?type=pulls" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-2 px-3 py-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 text-sm">
                  <GitPullRequest className="w-4 h-4" /> Pull requests
                </Link>
                <Link href="/search?type=issues" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-2 px-3 py-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 text-sm">
                  <AlertCircle className="w-4 h-4" /> Issues
                </Link>
                <Link href="/notifications" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-2 px-3 py-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 text-sm">
                  <Bell className="w-4 h-4" /> Notifications
                  {unreadCount > 0 && <span className="counter">{unreadCount}</span>}
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
