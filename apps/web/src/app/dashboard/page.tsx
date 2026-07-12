'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Plus, BookOpen, Star, GitFork, Loader2, Search, Zap, GitBranch, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { usersApi, searchApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Go: '#00ADD8',
  Rust: '#dea584', Java: '#b07219', 'C++': '#f34b7d', HTML: '#e34c26', CSS: '#563d7c',
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [repoFilter, setRepoFilter] = require('react').useState('');

  const { data: repos = [], isLoading } = useQuery({
    queryKey: ['my-repos', user?.username],
    queryFn: () => usersApi.getUserRepos(user!.username),
    enabled: !!user,
  });

  const { data: explore } = useQuery({
    queryKey: ['explore-repos'],
    queryFn: () => searchApi.repositories({ sort: 'stars', page: 1 }),
  });

  const filteredRepos = repos.filter((r: any) => r.name.toLowerCase().includes(repoFilter.toLowerCase()));
  const exploreRepos = explore?.data?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117]">
      <Navbar />
      <div className="max-w-screen-xl mx-auto px-4 pt-20 pb-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Top Repositories</h2>
              <Link href="/new" className="btn btn-primary btn-xs">
                <Plus className="w-3.5 h-3.5" /> New
              </Link>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={repoFilter} onChange={(e: any) => setRepoFilter(e.target.value)}
                placeholder="Find a repository..." className="input text-xs pl-9 py-1.5" />
            </div>

            <div className="space-y-1 max-h-96 overflow-y-auto">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> :
                filteredRepos.slice(0, 20).map((r: any) => (
                  <Link key={r.id} href={`/${r.owner?.username || user?.username}/${r.name}`}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-white dark:hover:bg-slate-800 text-sm transition-colors group">
                    <div className="w-4 h-4 rounded-sm bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-slate-700 dark:text-slate-300 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                      {r.owner?.username || user?.username}/{r.name}
                    </span>
                    {r.isPrivate && <span className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1">Private</span>}
                  </Link>
                ))}
              {filteredRepos.length === 0 && !isLoading && (
                <p className="text-xs text-slate-400 px-2 py-4">No repositories found</p>
              )}
            </div>
          </div>

          {/* Center Feed */}
          <div className="flex-1 min-w-0">
            {/* Welcome card */}
            <div className="card p-6 mb-6 bg-gradient-to-r from-emerald-600 to-emerald-700 border-0 text-white">
              <h2 className="text-xl font-bold mb-2">Welcome to PakHub, {user?.name || user?.username}! 🇵🇰</h2>
              <p className="text-emerald-100 text-sm mb-4">Start building by creating a new repository or exploring existing projects.</p>
              <div className="flex items-center gap-3">
                <Link href="/new" className="btn btn-sm bg-white text-emerald-700 hover:bg-emerald-50 border-0 font-semibold">
                  <Plus className="w-4 h-4" /> Create repository
                </Link>
                <Link href="/explore" className="btn btn-sm bg-white/10 text-white hover:bg-white/20 border-white/20">
                  Explore
                </Link>
              </div>
            </div>

            {/* Recent repos */}
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Your Repositories</h3>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : repos.length === 0 ? (
              <div className="card p-8 text-center">
                <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">No repositories yet</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Create your first repository to get started.</p>
                <Link href="/new" className="btn btn-primary btn-sm">
                  <Plus className="w-4 h-4" /> New repository
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {repos.slice(0, 8).map((r: any) => (
                  <div key={r.id} className="card-hover p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link href={`/${r.owner?.username || user?.username}/${r.name}`} className="text-base font-semibold text-link">
                          {r.name}
                        </Link>
                        {r.isPrivate && <span className="badge badge-neutral text-[10px] ml-2">Private</span>}
                        {r.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{r.description}</p>}
                      </div>
                      <button className="btn btn-secondary btn-xs"><Star className="w-3.5 h-3.5" /> Star</button>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                      {r.language && (
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: LANG_COLORS[r.language] || '#94a3b8' }} />{r.language}</span>
                      )}
                      {r.starsCount > 0 && <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{r.starsCount}</span>}
                      {r.forksCount > 0 && <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" />{r.forksCount}</span>}
                      <span>Updated {formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-72 flex-shrink-0 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Explore Repositories</h3>
              <div className="space-y-3">
                {exploreRepos.map((r: any) => (
                  <div key={r.id} className="card p-3">
                    <Link href={`/${r.owner?.username}/${r.name}`} className="text-sm font-semibold text-link">
                      {r.owner?.username}/{r.name}
                    </Link>
                    {r.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{r.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Star className="w-3 h-3" />{r.starsCount || 0}</span>
                      {r.language && <span>{r.language}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
