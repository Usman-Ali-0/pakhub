'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { BookOpen, Star, GitFork, Code2, AlertCircle, GitPullRequest, Settings, Lock, Eye, GitCommit, Tag } from 'lucide-react';
import { reposApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

export default function RepoLayout({ children }: { children: React.ReactNode }) {
  const { owner, repo } = useParams();
  const pathname = usePathname();
  const { user } = useAuthStore();

  const { data: repository, isLoading, error } = useQuery({
    queryKey: ['repo', owner, repo],
    queryFn: () => reposApi.getRepo(owner as string, repo as string),
    retry: false,
  });

  const handleStar = async () => {
    try {
      await reposApi.starRepo(owner as string, repo as string);
      toast.success(repository?.isStarred ? 'Unstarred' : 'Starred');
    } catch { toast.error('Failed to update star'); }
  };

  const handleFork = async () => {
    try {
      const forked = await reposApi.forkRepo(owner as string, repo as string);
      toast.success('Repository forked!');
      window.location.href = `/${user?.username}/${forked.name || repo}`;
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to fork'); }
  };

  const basePath = `/${owner}/${repo}`;
  const tabs = [
    { name: 'Code', href: basePath, icon: Code2, match: (p: string) => p === basePath || p.startsWith(`${basePath}/blob`) },
    { name: 'Issues', href: `${basePath}/issues`, icon: AlertCircle, count: repository?.openIssuesCount },
    { name: 'Pull requests', href: `${basePath}/pulls`, icon: GitPullRequest },
    { name: 'Commits', href: `${basePath}/commits`, icon: GitCommit },
    { name: 'Releases', href: `${basePath}/releases`, icon: Tag },
    ...(user?.username === owner ? [{ name: 'Settings', href: `${basePath}/settings`, icon: Settings }] : []),
  ];

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117]">
      <Navbar />
      <div className="pt-24 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 animate-pulse h-32" />
    </div>
  );

  if (!repository) return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117]">
      <Navbar />
      <div className="pt-32 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {error ? 'Error loading repository' : 'Repository not found'}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          {error 
            ? ((error as any).response?.data?.error || (error as any).message || 'An unexpected error occurred.')
            : 'It may be private, or it may have been deleted.'}
        </p>
        <Link href="/" className="btn btn-primary">Go to home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117]">
      <Navbar />

      <div className="pt-14 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="max-w-screen-xl mx-auto px-4 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2.5">
              {repository.isPrivate ? <Lock className="w-5 h-5 text-slate-400" /> : <BookOpen className="w-5 h-5 text-slate-400" />}
              <h1 className="text-xl flex items-center">
                <Link href={`/${owner}`} className="text-link">{owner}</Link>
                <span className="text-slate-300 dark:text-slate-600 mx-1.5 font-light">/</span>
                <Link href={basePath} className="text-link font-semibold">{repository.name}</Link>
              </h1>
              <span className={`ml-3 px-2 py-0.5 rounded-md text-xs font-medium border ${repository.isPrivate ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' : 'badge-neutral'}`}>
                {repository.isPrivate ? 'Private' : 'Public'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => {}} className="btn btn-secondary btn-sm">
                <Eye className="w-4 h-4 text-slate-400" /> Watch
                <span className="counter ml-1">{repository.watchersCount || 0}</span>
              </button>
              <button id="star-btn" onClick={handleStar} className="btn btn-secondary btn-sm">
                <Star className={`w-4 h-4 ${repository.isStarred ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
                {repository.isStarred ? 'Starred' : 'Star'}
                <span className="counter ml-1">{repository.starsCount}</span>
              </button>
              <button id="fork-btn" onClick={handleFork} className="btn btn-secondary btn-sm">
                <GitFork className="w-4 h-4 text-slate-400" /> Fork
                <span className="counter ml-1">{repository.forksCount}</span>
              </button>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto no-scrollbar">
            {tabs.map(tab => {
              const isActive = 'match' in tab ? (tab as any).match(pathname) : pathname.startsWith(tab.href);
              return (
                <Link key={tab.name} href={tab.href}
                  className={isActive ? 'tab-active' : 'tab-inactive'}>
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                  {'count' in tab && tab.count !== undefined && tab.count > 0 && (
                    <span className="counter ml-1">{tab.count}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="max-w-screen-xl mx-auto px-4 py-8">
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading page...</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
