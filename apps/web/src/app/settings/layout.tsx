'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { 
  User, Shield, Key, Bell, Bot, CreditCard, 
  Settings as SettingsIcon, LayoutTemplate
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const sidebarLinks = [
  { name: 'Public Profile', href: '/settings/profile', icon: User },
  { name: 'Account', href: '/settings/account', icon: SettingsIcon },
  { name: 'Security', href: '/settings/security', icon: Shield },
  { name: 'SSH Keys', href: '/settings/keys', icon: Key },
  { name: 'AI Models (BYOAI)', href: '/settings/ai', icon: Bot, highlight: true },
  { name: 'Notifications', href: '/settings/notifications', icon: Bell },
  { name: 'Appearance', href: '/settings/appearance', icon: LayoutTemplate },
  { name: 'Billing', href: '/settings/billing', icon: CreditCard },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="max-w-screen-xl mx-auto px-4 pt-24 pb-12">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-lg">
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-slate-900 leading-tight">{user.name || user.username}</div>
                <div className="text-xs text-slate-500">Personal settings</div>
              </div>
            </div>

            <nav className="space-y-1">
              {sidebarLinks.map(link => {
                const isActive = pathname === link.href || (pathname === '/settings' && link.href === '/settings/profile');
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`
                      flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors
                      ${isActive ? 'bg-white text-slate-900 font-semibold border border-slate-200 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'}
                    `}
                  >
                    <link.icon className={`w-4 h-4 ${isActive ? (link.highlight ? 'text-blue-600' : 'text-slate-700') : 'text-slate-400'}`} />
                    {link.name}
                    {link.highlight && (
                      <span className="ml-auto bg-blue-50 text-blue-600 border border-blue-100 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Beta</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
          
        </div>
      </div>
    </div>
  );
}
