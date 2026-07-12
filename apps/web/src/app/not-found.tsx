import Link from 'next/link';
import { AlertTriangle, Home } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117] flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <AlertTriangle className="w-20 h-20 text-slate-300 dark:text-slate-700 mb-6" />
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">404</h1>
        <h2 className="text-xl font-medium text-slate-700 dark:text-slate-300 mb-6 text-center">
          This is not the web page you are looking for.
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md text-center">
          The page or repository you are trying to access does not exist or may have been moved.
        </p>
        <Link href="/" className="btn btn-primary">
          <Home className="w-4 h-4" /> Go back home
        </Link>
      </div>
    </div>
  );
}
