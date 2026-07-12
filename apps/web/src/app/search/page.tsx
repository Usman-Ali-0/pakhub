'use client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, Suspense } from 'react';
import { Search, BookOpen, User, AlertCircle, Star, GitFork, Loader2 } from 'lucide-react';
import { searchApi } from '@/lib/api';
import { Navbar } from '@/components/layout/Navbar';
import { formatDistanceToNow } from 'date-fns';

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Go: '#00ADD8', Rust: '#dea584', Java: '#b07219', 'C++': '#f34b7d',
  C: '#555555', HTML: '#e34c26', CSS: '#563d7c', Ruby: '#701516', PHP: '#4F5D95',
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'repositories';
  const [query, setQuery] = useState(q);

  const { data: repos, isLoading: reposLoading } = useQuery({
    queryKey: ['search-repos', q],
    queryFn: () => searchApi.repositories({ q }),
    enabled: type === 'repositories' && !!q,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['search-users', q],
    queryFn: () => searchApi.users({ q }),
    enabled: type === 'users' && !!q,
  });

  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: ['search-issues', q],
    queryFn: () => searchApi.issues({ q }),
    enabled: type === 'issues' && !!q,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}&type=${type}`);
  };

  const isLoading = type === 'repositories' ? reposLoading : type === 'users' ? usersLoading : issuesLoading;
  const results = type === 'repositories' ? repos?.data : type === 'users' ? users?.data : issues?.data;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-20 pb-12">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search PakHub..."
              className="input input-lg pl-12 text-base" autoFocus />
          </div>
        </form>

        {q && (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar - type tabs */}
            <div className="w-full md:w-48 flex-shrink-0">
              <div className="card divide-y divide-slate-100 dark:divide-slate-700">
                {[
                  { key: 'repositories', label: 'Repositories', icon: BookOpen },
                  { key: 'users', label: 'Users', icon: User },
                  { key: 'issues', label: 'Issues', icon: AlertCircle },
                ].map(t => (
                  <button key={t.key} onClick={() => router.push(`/search?q=${encodeURIComponent(q)}&type=${t.key}`)}
                    className={`flex items-center gap-2 w-full px-4 py-3 text-sm transition-colors ${
                      type === t.key ? 'bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white border-l-2 border-emerald-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}>
                    <t.icon className="w-4 h-4" /> {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : !results?.length ? (
                <div className="text-center py-12 text-slate-500">No {type} found matching "{q}"</div>
              ) : (
                <div className="space-y-0 divide-y divide-slate-200 dark:divide-slate-700">
                  {type === 'repositories' && results.map((r: any) => (
                    <div key={r.id} className="py-5">
                      <Link href={`/${r.owner?.username || r.ownerUsername}/${r.name}`} className="text-lg font-semibold text-link">
                        {r.owner?.username || r.ownerUsername}/{r.name}
                      </Link>
                      {r.description && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{r.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        {r.language && <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: LANG_COLORS[r.language] || '#94a3b8' }} />{r.language}</span>}
                        <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{r.starsCount || 0}</span>
                        <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" />{r.forksCount || 0}</span>
                        <span>Updated {formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  ))}
                  {type === 'users' && results.map((u: any) => (
                    <div key={u.id} className="flex items-center gap-4 py-4">
                      <div className="avatar avatar-lg">{u.username[0].toUpperCase()}</div>
                      <div>
                        <Link href={`/${u.username}`} className="text-base font-semibold text-link">{u.username}</Link>
                        {u.name && <p className="text-sm text-slate-500">{u.name}</p>}
                        {u.bio && <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{u.bio}</p>}
                      </div>
                    </div>
                  ))}
                  {type === 'issues' && results.map((i: any) => (
                    <div key={i.id} className="py-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`w-4 h-4 ${i.state === 'OPEN' ? 'text-emerald-600' : 'text-purple-600'}`} />
                        <Link href={`/${i.repo?.owner?.username}/${i.repo?.name}/issues/${i.number}`} className="font-semibold text-link">{i.title}</Link>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">#{i.number} · {i.repo?.name} · opened {formatDistanceToNow(new Date(i.createdAt), { addSuffix: true })}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
