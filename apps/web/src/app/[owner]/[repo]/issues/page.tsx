'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, MessageSquare, Search, Tag, Milestone, ChevronDown, Loader2, Plus } from 'lucide-react';
import { issuesApi } from '@/lib/api';
import { LabelBadge } from '@/components/ui/LabelBadge';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/store/auth.store';

export default function IssuesListPage() {
  const { owner, repo } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const state = searchParams.get('state') || 'open';
  const page = parseInt(searchParams.get('page') || '1');
  const label = searchParams.get('label') || '';
  const sort = searchParams.get('sort') || 'newest';

  const { data, isLoading } = useQuery({
    queryKey: ['issues', owner, repo, state, page, label, sort],
    queryFn: () => issuesApi.list(owner as string, repo as string, { state, page, label, sort }),
  });

  const issues = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, pages: 1 };

  const { data: labels } = useQuery({
    queryKey: ['labels', owner, repo],
    queryFn: () => issuesApi.getLabels(owner as string, repo as string),
  });

  const updateFilter = (params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v);
      else sp.delete(k);
    });
    sp.delete('page');
    router.push(`/${owner}/${repo}/issues?${sp.toString()}`);
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/${owner}/${repo}/issues?state=open`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${state === 'open' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
            <AlertCircle className="w-4 h-4" /> Open
            <span className="counter ml-1">{state === 'open' ? pagination.total : ''}</span>
          </Link>
          <Link href={`/${owner}/${repo}/issues?state=closed`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${state === 'closed' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
            <CheckCircle2 className="w-4 h-4" /> Closed
          </Link>
        </div>
        <Link href={`/${owner}/${repo}/issues/new`} className="btn btn-primary btn-sm" id="new-issue-btn">
          <Plus className="w-4 h-4" /> New issue
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 rounded-t-lg">
          <div className="flex items-center gap-4 text-sm">
            <button onClick={() => updateFilter({ sort: 'newest' })} className={`font-medium ${sort === 'newest' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
              Newest
            </button>
            <button onClick={() => updateFilter({ sort: 'oldest' })} className={`font-medium ${sort === 'oldest' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
              Oldest
            </button>
            <button onClick={() => updateFilter({ sort: 'most_commented' })} className={`font-medium ${sort === 'most_commented' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
              Most commented
            </button>
          </div>
        </div>

        {/* Issues list */}
        {issues.length === 0 ? (
          <EmptyState icon={AlertCircle} title="No issues found" description={`There are no ${state} issues in this repository.`}
            action={{ label: 'New issue', href: `/${owner}/${repo}/issues/new` }} />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {issues.map((issue: any) => (
              <div key={issue.id} className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="mt-0.5">
                  {issue.state === 'OPEN' ? (
                    <AlertCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <Link href={`/${owner}/${repo}/issues/${issue.number}`}
                      className="text-base font-semibold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                      {issue.title}
                    </Link>
                    {issue.labels?.map((il: any) => {
                      const l = il.label || il;
                      return <LabelBadge key={l.id || l.name} name={l.name} color={l.color} />;
                    })}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    #{issue.number} opened {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })} by {issue.author?.username || 'unknown'}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 flex-shrink-0">
                  {(issue._count?.comments || issue.comments?.length > 0) && (
                    <Link href={`/${owner}/${repo}/issues/${issue.number}`} className="flex items-center gap-1 text-xs hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                      <MessageSquare className="w-4 h-4" />
                      {issue._count?.comments || issue.comments?.length || 0}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination currentPage={pagination.page} totalPages={pagination.pages}
        onPageChange={(p) => { const sp = new URLSearchParams(searchParams.toString()); sp.set('page', String(p)); router.push(`/${owner}/${repo}/issues?${sp.toString()}`); }} />
    </div>
  );
}
