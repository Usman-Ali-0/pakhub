'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { GitPullRequest, GitMerge, XCircle, MessageSquare, Loader2, Plus, CheckCircle2 } from 'lucide-react';
import { pullsApi } from '@/lib/api';
import { LabelBadge } from '@/components/ui/LabelBadge';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDistanceToNow } from 'date-fns';

export default function PullsListPage() {
  const { owner, repo } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const state = searchParams.get('state') || 'open';
  const page = parseInt(searchParams.get('page') || '1');

  const { data, isLoading } = useQuery({
    queryKey: ['pulls', owner, repo, state, page],
    queryFn: () => pullsApi.list(owner as string, repo as string, { state, page }),
  });

  const prs = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, pages: 1 };

  const getStateIcon = (pr: any) => {
    if (pr.state === 'MERGED') return <GitMerge className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    if (pr.state === 'CLOSED') return <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />;
    if (pr.isDraft) return <GitPullRequest className="w-5 h-5 text-slate-400" />;
    return <GitPullRequest className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/${owner}/${repo}/pulls?state=open`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${state === 'open' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
            <GitPullRequest className="w-4 h-4" /> Open
          </Link>
          <Link href={`/${owner}/${repo}/pulls?state=closed`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${state === 'closed' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
            <CheckCircle2 className="w-4 h-4" /> Closed
          </Link>
        </div>
        <Link href={`/${owner}/${repo}/pulls/new`} className="btn btn-primary btn-sm" id="new-pr-btn">
          <Plus className="w-4 h-4" /> New pull request
        </Link>
      </div>

      <div className="card">
        {prs.length === 0 ? (
          <EmptyState icon={GitPullRequest} title="No pull requests found" description={`There are no ${state} pull requests.`}
            action={{ label: 'New pull request', href: `/${owner}/${repo}/pulls/new` }} />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {prs.map((pr: any) => (
              <div key={pr.id} className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="mt-0.5">{getStateIcon(pr)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <Link href={`/${owner}/${repo}/pulls/${pr.number}`}
                      className="text-base font-semibold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400">
                      {pr.title}
                    </Link>
                    {pr.isDraft && <span className="badge badge-neutral">Draft</span>}
                    {pr.labels?.map((pl: any) => {
                      const l = pl.label || pl;
                      return <LabelBadge key={l.id || l.name} name={l.name} color={l.color} />;
                    })}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    #{pr.number} opened {formatDistanceToNow(new Date(pr.createdAt), { addSuffix: true })} by {pr.author?.username || 'unknown'}
                    {pr.state === 'MERGED' && pr.mergedAt && <span> · merged {formatDistanceToNow(new Date(pr.mergedAt), { addSuffix: true })}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-slate-400 flex-shrink-0">
                  {(pr._count?.comments > 0 || pr.comments?.length > 0) && (
                    <span className="flex items-center gap-1 text-xs">
                      <MessageSquare className="w-4 h-4" /> {pr._count?.comments || pr.comments?.length || 0}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination currentPage={pagination.page} totalPages={pagination.pages}
        onPageChange={(p) => router.push(`/${owner}/${repo}/pulls?state=${state}&page=${p}`)} />
    </div>
  );
}
