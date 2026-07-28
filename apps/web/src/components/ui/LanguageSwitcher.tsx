'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { Locale } from '@/i18n/translations';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export function LanguageSwitcher({ variant = 'header' }: { variant?: 'header' | 'settings' }) {
  const { locale, setLocale, locales, t } = useI18n();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = async (code: Locale) => {
    setLocale(code);
    setOpen(false);
    if (user) {
      authApi.updateMe({ preferredLanguage: code }).catch(() => {});
    }
  };

  const current = locales.find(l => l.code === locale);

  if (variant === 'settings') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {locales.map(l => (
          <button
            key={l.code}
            onClick={() => handleSelect(l.code)}
            className={`flex items-center justify-between p-3 rounded-lg border-2 text-left transition-all ${
              locale === l.code
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{l.nativeName}</p>
              <p className="text-xs text-slate-500">{l.name}</p>
            </div>
            {locale === l.code && <Check className="w-4 h-4 text-emerald-600" />}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        id="nav-language"
        onClick={() => setOpen(!open)}
        className="p-2 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1"
        title={t.nav.language}
      >
        <Globe className="w-5 h-5" />
        <span className="text-xs hidden xl:inline">{current?.nativeName}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 max-h-80 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 animate-slide-down">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
            {t.settings.selectLanguage}
          </div>
          {locales.map(l => (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${
                locale === l.code ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>{l.nativeName} <span className="text-slate-400 text-xs">({l.name})</span></span>
              {locale === l.code && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
