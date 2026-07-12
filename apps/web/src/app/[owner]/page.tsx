'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { ContributionGraph } from '@/components/ui/ContributionGraph';
import { BookOpen, Star, GitFork, Users, MapPin, LinkIcon, Building, Calendar, Loader2, UserPlus, UserMinus } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Go: '#00ADD8',
  Rust: '#dea584', Java: '#b07219', 'C++': '#f34b7d', HTML: '#e34c26', CSS: '#563d7c',
};

export default function UserProfilePage() {
  const { owner } = useParams();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'repositories';
  const { user: me } = useAuthStore();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user', owner],
    queryFn: () => usersApi.getUser(owner as string),
  });

  const { data: repos = [] } = useQuery({
    queryKey: ['user-repos', owner],
    queryFn: () => usersApi.getUserRepos(owner as string),
    enabled: tab === 'repositories',
  });

  const { data: starred = [] } = useQuery({
    queryKey: ['user-starred', owner],
    queryFn: () => usersApi.getUserStarred(owner as string),
    enabled: tab === 'stars',
  });

  const followMutation = useMutation({
    mutationFn: () => usersApi.follow(owner as string),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['user', owner] }); toast.success(profile?.isFollowing ? 'Unfollowed' : 'Following'); },
    onError: () => toast.error('Failed'),
  });

  const [repoSort, setRepoSort] = useState('updated');
  const sortedRepos = [...repos].sort((a: any, b: any) => {
    if (repoSort === 'stars') return (b.starsCount || 0) - (a.starsCount || 0);
    if (repoSort === 'name') return a.name.localeCompare(b.name);
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117]">
      <Navbar />
      <div className="flex justify-center pt-32"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117]">
      <Navbar />
      <div className="pt-32 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">User not found</h1>
        <Link href="/" className="btn btn-primary mt-4">Go home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117]">
      <Navbar />
      <div className="max-w-screen-xl mx-auto px-4 pt-20 pb-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Profile */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="avatar avatar-2xl mb-4 text-6xl mx-auto lg:mx-0 shadow-lg">
              {profile.username[0].toUpperCase()}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{profile.name || profile.username}</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-light">@{profile.username}</p>

            {profile.bio && <p className="text-sm text-slate-700 dark:text-slate-300 mt-3 leading-relaxed">{profile.bio}</p>}

            {me && me.username !== owner && (
              <button onClick={() => followMutation.mutate()}
                className={`btn w-full mt-4 ${profile.isFollowing ? 'btn-secondary' : 'btn-primary'}`}>
                {profile.isFollowing ? <><UserMinus className="w-4 h-4" /> Unfollow</> : <><UserPlus className="w-4 h-4" /> Follow</>}
              </button>
            )}

            <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              {profile.company && <div className="flex items-center gap-2"><Building className="w-4 h-4 text-slate-400" />{profile.company}</div>}
              {profile.location && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" />{profile.location}</div>}
              {profile.website && <div className="flex items-center gap-2"><LinkIcon className="w-4 h-4 text-slate-400" /><a href={profile.website} className="text-link truncate" target="_blank">{profile.website}</a></div>}
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" />Joined {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })}</div>
            </div>

            <div className="flex items-center gap-4 mt-4 text-sm">
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <Users className="w-4 h-4 text-slate-400" /> <strong>{profile.followersCount || 0}</strong> <span className="text-slate-500">followers</span>
              </span>
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <strong>{profile.followingCount || 0}</strong> <span className="text-slate-500">following</span>
              </span>
            </div>
          </div>

          {/* Right content */}
          <div className="flex-1 min-w-0">
            {/* Contribution graph */}
            <div className="mb-6">
              <ContributionGraph />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 mb-6">
              <Link href={`/${owner}?tab=repositories`}
                className={tab === 'repositories' ? 'tab-active' : 'tab-inactive'}>
                <BookOpen className="w-4 h-4" /> Repositories <span className="counter">{repos.length}</span>
              </Link>
              <Link href={`/${owner}?tab=stars`}
                className={tab === 'stars' ? 'tab-active' : 'tab-inactive'}>
                <Star className="w-4 h-4" /> Stars
              </Link>
            </div>

            {/* Repositories tab */}
            {tab === 'repositories' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <select value={repoSort} onChange={e => setRepoSort(e.target.value)} className="input text-xs py-1.5 w-36">
                      <option value="updated">Last updated</option>
                      <option value="stars">Stars</option>
                      <option value="name">Name</option>
                    </select>
                  </div>
                  {me?.username === owner && (
                    <Link href="/new" className="btn btn-primary btn-sm">New</Link>
                  )}
                </div>

                <div className="space-y-3">
                  {sortedRepos.map((r: any) => (
                    <div key={r.id} className="card-hover p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link href={`/${owner}/${r.name}`} className="text-base font-semibold text-link">{r.name}</Link>
                          {r.isPrivate && <span className="badge badge-neutral text-[10px] ml-2">Private</span>}
                          {r.isFork && <span className="badge badge-neutral text-[10px] ml-1">Fork</span>}
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
                  {sortedRepos.length === 0 && (
                    <div className="card p-8 text-center text-slate-500">No repositories yet</div>
                  )}
                </div>
              </div>
            )}

            {/* Stars tab */}
            {tab === 'stars' && (
              <div className="space-y-3">
                {starred.length === 0 ? (
                  <div className="card p-8 text-center text-slate-500">No starred repositories</div>
                ) : starred.map((r: any) => (
                  <div key={r.id} className="card-hover p-4">
                    <Link href={`/${r.owner?.username}/${r.name}`} className="text-base font-semibold text-link">
                      {r.owner?.username}/{r.name}
                    </Link>
                    {r.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{r.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      {r.language && <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: LANG_COLORS[r.language] || '#94a3b8' }} />{r.language}</span>}
                      <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{r.starsCount || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
