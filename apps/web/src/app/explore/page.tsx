'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Star, GitFork, Loader2, Compass, TrendingUp, Users, Calendar } from 'lucide-react';
import { searchApi, usersApi } from '@/lib/api';
import { useState } from 'react';

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Go: '#00ADD8',
  Rust: '#dea584', Java: '#b07219', 'C++': '#f34b7d', HTML: '#e34c26', CSS: '#563d7c',
  Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138', Kotlin: '#A97BFF',
};

export default function ExplorePage() {
  const [language, setLanguage] = useState('');

  const { data: trending, isLoading } = useQuery({
    queryKey: ['trending-repos', language],
    queryFn: () => searchApi.repositories({ sort: 'stars', language, page: 1 }),
  });

  const { data: devs } = useQuery({
    queryKey: ['trending-devs'],
    queryFn: () => usersApi.listUsers({ page: 1 }),
  });

  const repos = trending?.data || [];
  const developers = devs?.data || [];

  const languages = ['', 'JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'C++', 'Ruby', 'PHP'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117]">
      <Navbar />
      <div className="max-w-screen-xl mx-auto px-4 pt-20 pb-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-4">
            <Compass className="w-3.5 h-3.5" /> Explore PakHub
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Discover amazing projects</h1>
          <p className="text-slate-500 dark:text-slate-400">Browse trending repositories and developers on PakHub.</p>
        </div>

        {/* Trending Repos */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" /> Trending Repositories
            </h2>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="input text-sm w-40 py-1.5">
              <option value="">All languages</option>
              {languages.slice(1).map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : repos.length === 0 ? (
            <div className="card p-8 text-center text-slate-500">No repositories found</div>
          ) : (
            <div className="card divide-y divide-slate-100 dark:divide-slate-700">
              {repos.map((r: any, idx: number) => (
                <div key={r.id} className="flex items-start gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <span className="text-lg font-bold text-slate-300 dark:text-slate-600 w-6 text-right mt-0.5">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/${r.owner?.username}/${r.name}`} className="text-base font-semibold text-link">
                      {r.owner?.username} / {r.name}
                    </Link>
                    {r.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{r.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {r.language && (
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: LANG_COLORS[r.language] || '#94a3b8' }} />
                          {r.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" /> {r.starsCount || 0}</span>
                      <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" /> {r.forksCount || 0}</span>
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-xs mt-1">
                    <Star className="w-3.5 h-3.5" /> Star
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Trending Developers */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-emerald-600" /> Developers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {developers.slice(0, 9).map((u: any) => (
              <Link key={u.id} href={`/${u.username}`} className="card-hover p-4 flex items-center gap-3">
                <div className="avatar avatar-lg">{u.username[0].toUpperCase()}</div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{u.name || u.username}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">@{u.username}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
