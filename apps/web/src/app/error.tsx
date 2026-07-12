'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, ServerCrash } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117] flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <ServerCrash className="w-20 h-20 text-red-400 dark:text-red-900/50 mb-6" />
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">500</h1>
        <h2 className="text-xl font-medium text-slate-700 dark:text-slate-300 mb-6 text-center">
          Oops, something went wrong on our end.
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md text-center">
          An unexpected error occurred. Our technical team has been notified. Please try refreshing the page.
        </p>
        
        <div className="flex items-center gap-4">
          <button onClick={() => reset()} className="btn btn-secondary">
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
          <Link href="/" className="btn btn-primary">
            <Home className="w-4 h-4" /> Go back home
          </Link>
        </div>
      </div>
    </div>
  );
}
