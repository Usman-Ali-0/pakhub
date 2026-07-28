'use client';

import { Globe } from 'lucide-react';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useTranslation } from '@/i18n/I18nProvider';

export default function LanguageSettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
          <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t.settings.language}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.settings.languageDesc}</p>
        </div>
      </div>
      <LanguageSwitcher variant="settings" />
    </div>
  );
}
