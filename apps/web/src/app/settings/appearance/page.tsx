'use client';
import { Construction } from 'lucide-react';

export default function AppearanceSettingsPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appearance</h1>
        <p className="text-sm text-slate-500 mt-1">Manage how the application looks to you.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Construction className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Work in Progress</h3>
        <p className="text-slate-500 max-w-sm">
          We are currently building this feature. Check back later for updates!
        </p>
      </div>
    </div>
  );
}
