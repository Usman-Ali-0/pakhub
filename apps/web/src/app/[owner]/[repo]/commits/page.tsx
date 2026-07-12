'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { GitCommit, Loader2, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { gitApi, reposApi } from '@/lib/api';
import { BranchSelector } from '@/components/ui/BranchSelector';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

export default function CommitsPage() {
  const { owner, repo } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const ref = searchParams.get('ref') || 'HEAD';
  const page = parseInt(searchParams.get('page') || '1');

  const { data: branches = [] } = useQuery({
    queryKey: ['branches', owner, repo],
    queryFn: () => reposApi.getBranches(owner as string, repo as string),
  });

  const { data: commits = [], isLoading } = useQuery({
    queryKey: ['commits', owner, repo, ref, page],
    queryFn: () => gitApi.getCommits(owner as string, repo as string, ref, { page, limit: 30 }),
  });

  const branchNames = branches.map((b: any) => b.name || b);
  const defaultBranch = branches.find((b: any) => b.isDefault)?.name || branches[0]?.name || 'main';

  // Group commits by date
  const grouped: Record<string, any[]> = {};
  commits.forEach((c: any) => {
    const date = format(new Date(c.author?.date || c.createdAt), 'MMMM d, yyyy');
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(c);
  });

  const handleCopySha = (sha: string) => {
    navigator.clipboard.writeText(sha);
    toast.success('SHA copied');
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <BranchSelector
          branches={branchNames}
          currentRef={ref}
          onChange={(b) => router.push(`/${owner}/${repo}/commits?ref=${b}`)}
          defaultBranch={defaultBranch}
        />
      </div>

      {Object.entries(grouped).map(([date, dayCommits]) => (
        <div key={date}>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-slate-400" /> Commits on {date}
          </h3>
          <div className="card divide-y divide-slate-100 dark:divide-slate-700">
            {dayCommits.map((c: any) => (
              <div key={c.sha || c.oid} className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="avatar avatar-sm flex-shrink-0">{c.author?.name?.[0]?.toUpperCase() || '?'}</div>
                <div className="flex-1 min-w-0">
                  <Link href={`/${owner}/${repo}/commits/${c.sha || c.oid}`}
                    className="text-sm font-medium text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 truncate block">
                    {c.message?.split('\n')[0]}
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {c.author?.name} committed {formatDistanceToNow(new Date(c.author?.date || c.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleCopySha(c.sha || c.oid)} className="btn btn-ghost btn-xs" title="Copy SHA">
                    <Copy className="w-3 h-3" />
                  </button>
                  <Link href={`/${owner}/${repo}/commits/${c.sha || c.oid}`}
                    className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                    {(c.shortSha || c.sha || c.oid || '').substring(0, 7)}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {commits.length === 0 && (
        <div className="card p-8 text-center text-slate-500">No commits found</div>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-3">
        {page > 1 && (
          <button onClick={() => router.push(`/${owner}/${repo}/commits?ref=${ref}&page=${page - 1}`)} className="btn btn-secondary btn-sm">
            <ChevronLeft className="w-4 h-4" /> Newer
          </button>
        )}
        {commits.length >= 30 && (
          <button onClick={() => router.push(`/${owner}/${repo}/commits?ref=${ref}&page=${page + 1}`)} className="btn btn-secondary btn-sm">
            Older <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
