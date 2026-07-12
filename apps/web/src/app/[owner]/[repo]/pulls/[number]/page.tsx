'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { GitPullRequest, GitMerge, XCircle, Loader2, CheckCircle2, AlertCircle, ChevronDown, GitCommit, FileText, MessageSquare, Sparkles, ArrowRight } from 'lucide-react';
import { pullsApi, gitApi } from '@/lib/api';
import { LabelBadge } from '@/components/ui/LabelBadge';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { useAuthStore } from '@/store/auth.store';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import toast from 'react-hot-toast';

export default function PRDetailPage() {
  const { owner, repo, number } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const prNum = parseInt(number as string);
  const [tab, setTab] = useState<'conversation' | 'commits' | 'files'>('conversation');
  const [newComment, setNewComment] = useState('');
  const [showMergeOptions, setShowMergeOptions] = useState(false);
  const [aiReviewing, setAiReviewing] = useState(false);

  const { data: pr, isLoading } = useQuery({
    queryKey: ['pr', owner, repo, prNum],
    queryFn: () => pullsApi.get(owner as string, repo as string, prNum),
  });

  const { data: diff } = useQuery({
    queryKey: ['pr-diff', owner, repo, pr?.baseBranch, pr?.headBranch],
    queryFn: () => gitApi.compare(owner as string, repo as string, pr.baseBranch, pr.headBranch),
    enabled: !!pr && tab === 'files',
  });

  const { data: commits } = useQuery({
    queryKey: ['pr-commits', owner, repo, pr?.headBranch],
    queryFn: () => gitApi.getCommits(owner as string, repo as string, pr.headBranch, { limit: 50 }),
    enabled: !!pr && tab === 'commits',
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => pullsApi.addComment(owner as string, repo as string, prNum, body),
    onSuccess: () => { setNewComment(''); qc.invalidateQueries({ queryKey: ['pr', owner, repo, prNum] }); toast.success('Comment added'); },
    onError: () => toast.error('Failed to add comment'),
  });

  const mergeMutation = useMutation({
    mutationFn: () => pullsApi.merge(owner as string, repo as string, prNum),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pr', owner, repo, prNum] }); toast.success('Pull request merged!'); },
    onError: () => toast.error('Failed to merge'),
  });

  const closeMutation = useMutation({
    mutationFn: () => pullsApi.update(owner as string, repo as string, prNum, { state: pr?.state === 'OPEN' ? 'CLOSED' : 'OPEN' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pr', owner, repo, prNum] }); toast.success(pr?.state === 'OPEN' ? 'PR closed' : 'PR reopened'); },
  });

  const handleAiReview = async () => {
    setAiReviewing(true);
    try {
      const result = await pullsApi.aiReview(owner as string, repo as string, prNum);
      toast.success('AI review submitted');
      qc.invalidateQueries({ queryKey: ['pr', owner, repo, prNum] });
    } catch { toast.error('AI review failed — check your AI provider settings'); }
    finally { setAiReviewing(false); }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  if (!pr) return <div className="text-center py-20 text-slate-500">Pull request not found</div>;

  const stateIcon = pr.state === 'MERGED' ? <GitMerge className="w-4 h-4" /> : pr.state === 'CLOSED' ? <XCircle className="w-4 h-4" /> : <GitPullRequest className="w-4 h-4" />;
  const stateClass = pr.state === 'MERGED' ? 'state-merged' : pr.state === 'CLOSED' ? 'state-closed' : pr.isDraft ? 'state-draft' : 'state-open';
  const stateLabel = pr.state === 'MERGED' ? 'Merged' : pr.state === 'CLOSED' ? 'Closed' : pr.isDraft ? 'Draft' : 'Open';

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {pr.title} <span className="text-slate-400 font-normal">#{pr.number}</span>
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={stateClass}>{stateIcon}{stateLabel}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            <Link href={`/${pr.author?.username}`} className="font-semibold text-slate-700 dark:text-slate-300 hover:underline">
              {pr.author?.username}
            </Link>{' '}
            wants to merge into <code className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-mono">{pr.baseBranch}</code>
            {' '}from <code className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-mono">{pr.headBranch}</code>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 mb-6">
        <button onClick={() => setTab('conversation')} className={tab === 'conversation' ? 'tab-active' : 'tab-inactive'}>
          <MessageSquare className="w-4 h-4" /> Conversation
        </button>
        <button onClick={() => setTab('commits')} className={tab === 'commits' ? 'tab-active' : 'tab-inactive'}>
          <GitCommit className="w-4 h-4" /> Commits
        </button>
        <button onClick={() => setTab('files')} className={tab === 'files' ? 'tab-active' : 'tab-inactive'}>
          <FileText className="w-4 h-4" /> Files changed
        </button>
      </div>

      {/* Conversation Tab */}
      {tab === 'conversation' && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0 space-y-4">
            {/* PR Body */}
            <div className="card">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 rounded-t-lg">
                <div className="avatar avatar-sm">{pr.author?.username?.[0]?.toUpperCase() || '?'}</div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{pr.author?.username}</span>
                <span className="text-xs text-slate-500">{formatDistanceToNow(new Date(pr.createdAt), { addSuffix: true })}</span>
              </div>
              <div className="p-4">
                {pr.body ? (
                  <div className="markdown-body prose prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}>{pr.body}</ReactMarkdown>
                  </div>
                ) : <p className="text-sm text-slate-400 italic">No description provided.</p>}
              </div>
            </div>

            {/* Comments */}
            {pr.comments?.map((c: any) => (
              <div key={c.id} className="card">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 rounded-t-lg">
                  <div className="avatar avatar-sm">{c.author?.username?.[0]?.toUpperCase() || '?'}</div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{c.author?.username}</span>
                  <span className="text-xs text-slate-500">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                </div>
                <div className="p-4 markdown-body prose prose-slate dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}>{c.body}</ReactMarkdown>
                </div>
              </div>
            ))}

            {/* Merge box */}
            {pr.state === 'OPEN' && user && (
              <div className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">This branch has no conflicts with the base branch</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <button id="merge-pr" onClick={() => mergeMutation.mutate()} disabled={mergeMutation.isPending} className="btn btn-primary btn-sm">
                      {mergeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
                      Merge pull request
                    </button>
                  </div>
                  <button onClick={handleAiReview} disabled={aiReviewing} className="btn btn-secondary btn-sm">
                    {aiReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-500" />}
                    AI Review
                  </button>
                </div>
              </div>
            )}

            {pr.state === 'MERGED' && (
              <div className="card p-4 bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                  <GitMerge className="w-5 h-5" />
                  <span className="font-semibold text-sm">Pull request successfully merged and closed.</span>
                </div>
              </div>
            )}

            {/* Comment form */}
            {user && (
              <div className="space-y-3">
                <MarkdownEditor value={newComment} onChange={setNewComment} placeholder="Leave a comment..." />
                <div className="flex justify-end gap-2">
                  {pr.state !== 'MERGED' && (
                    <button onClick={() => closeMutation.mutate()} className="btn btn-secondary btn-sm">
                      {pr.state === 'OPEN' ? 'Close pull request' : 'Reopen'}
                    </button>
                  )}
                  <button id="submit-pr-comment" onClick={() => newComment.trim() && commentMutation.mutate(newComment.trim())}
                    disabled={!newComment.trim() || commentMutation.isPending} className="btn btn-primary btn-sm">
                    Comment
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0 space-y-6">
            <div className="sidebar-section">
              <h3 className="sidebar-title">Reviewers</h3>
              {pr.reviews?.length > 0 ? pr.reviews.map((r: any) => (
                <div key={r.id} className="flex items-center gap-2 text-sm mb-1.5">
                  <div className="avatar avatar-sm">{r.author?.username?.[0]?.toUpperCase()}</div>
                  <span className="text-slate-700 dark:text-slate-300">{r.author?.username}</span>
                  <span className={`text-xs ml-auto ${r.state === 'APPROVED' ? 'text-emerald-600' : r.state === 'CHANGES_REQUESTED' ? 'text-red-500' : 'text-slate-400'}`}>
                    {r.state === 'APPROVED' ? '✓' : r.state === 'CHANGES_REQUESTED' ? '✗' : '○'}
                  </span>
                </div>
              )) : <p className="text-xs text-slate-400">No reviews yet</p>}
            </div>
            <div className="sidebar-section">
              <h3 className="sidebar-title">Labels</h3>
              {pr.labels?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">{pr.labels.map((pl: any) => { const l = pl.label || pl; return <LabelBadge key={l.id} name={l.name} color={l.color} />; })}</div>
              ) : <p className="text-xs text-slate-400">None yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* Commits Tab */}
      {tab === 'commits' && (
        <div className="card divide-y divide-slate-100 dark:divide-slate-700">
          {commits?.map((c: any) => (
            <div key={c.sha || c.oid} className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <GitCommit className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{c.message}</p>
                <p className="text-xs text-slate-500 mt-0.5">{c.author?.name} committed {formatDistanceToNow(new Date(c.author?.date || c.createdAt), { addSuffix: true })}</p>
              </div>
              <code className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{(c.shortSha || c.sha || c.oid || '').substring(0, 7)}</code>
            </div>
          )) || <div className="p-8 text-center text-slate-500">Loading commits...</div>}
        </div>
      )}

      {/* Files Changed Tab */}
      {tab === 'files' && (
        <div className="space-y-4">
          {diff?.files?.length > 0 ? diff.files.map((file: any, idx: number) => (
            <div key={idx} className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-sm">
                <span className="font-mono text-slate-700 dark:text-slate-300">{file.path || file.filename}</span>
                <span className="flex items-center gap-2 text-xs">
                  {file.additions > 0 && <span className="text-emerald-600 font-medium">+{file.additions}</span>}
                  {file.deletions > 0 && <span className="text-red-500 font-medium">-{file.deletions}</span>}
                </span>
              </div>
              {file.patch && (
                <div className="overflow-x-auto code-scroll">
                  <table className="w-full text-xs font-mono">
                    <tbody>
                      {file.patch.split('\n').map((line: string, li: number) => {
                        const cls = line.startsWith('+') && !line.startsWith('+++') ? 'diff-add' : line.startsWith('-') && !line.startsWith('---') ? 'diff-del' : line.startsWith('@@') ? 'diff-hunk' : '';
                        return (
                          <tr key={li} className={cls}>
                            <td className="code-line-number select-none w-10 text-right pr-2 border-r border-slate-200 dark:border-slate-700">{li + 1}</td>
                            <td className="pl-4 pr-4 py-0 whitespace-pre">{line}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )) : (
            <div className="card p-8 text-center text-slate-500">
              {diff ? 'No file changes found' : <Loader2 className="w-6 h-6 animate-spin mx-auto" />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
