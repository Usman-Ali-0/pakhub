'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Calendar, Loader2, Tag, Users, Milestone as MilestoneIcon } from 'lucide-react';
import { issuesApi } from '@/lib/api';
import { LabelBadge } from '@/components/ui/LabelBadge';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { useAuthStore } from '@/store/auth.store';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function IssueDetailPage() {
  const { owner, repo, number } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const issueNum = parseInt(number as string);
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', owner, repo, issueNum],
    queryFn: () => issuesApi.get(owner as string, repo as string, issueNum),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['issue-comments', owner, repo, issueNum],
    queryFn: () => issuesApi.getComments(owner as string, repo as string, issueNum),
    enabled: !!issue,
  });

  const addCommentMutation = useMutation({
    mutationFn: (body: string) => issuesApi.addComment(owner as string, repo as string, issueNum, body),
    onSuccess: () => {
      setNewComment('');
      qc.invalidateQueries({ queryKey: ['issue-comments', owner, repo, issueNum] });
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  const toggleStateMutation = useMutation({
    mutationFn: () => issuesApi.update(owner as string, repo as string, issueNum, { state: issue?.state === 'OPEN' ? 'CLOSED' : 'OPEN' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issue', owner, repo, issueNum] });
      toast.success(issue?.state === 'OPEN' ? 'Issue closed' : 'Issue reopened');
    },
    onError: () => toast.error('Failed to update issue'),
  });

  const saveTitleMutation = useMutation({
    mutationFn: (title: string) => issuesApi.update(owner as string, repo as string, issueNum, { title }),
    onSuccess: () => {
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ['issue', owner, repo, issueNum] });
      toast.success('Title updated');
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  if (!issue) return <div className="text-center py-20 text-slate-500">Issue not found</div>;

  return (
    <div className="max-w-5xl">
      {/* Title */}
      <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input flex-1 text-lg font-semibold" autoFocus />
            <button onClick={() => saveTitleMutation.mutate(editTitle)} className="btn btn-primary btn-sm">Save</button>
            <button onClick={() => setIsEditing(false)} className="btn btn-secondary btn-sm">Cancel</button>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex-1">
              {issue.title} <span className="text-slate-400 dark:text-slate-500 font-normal">#{issue.number}</span>
            </h1>
            {(user?.username === issue.author?.username || user?.username === owner) && (
              <button onClick={() => { setEditTitle(issue.title); setIsEditing(true); }} className="btn btn-secondary btn-sm">Edit</button>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 mt-3">
          <span className={issue.state === 'OPEN' ? 'state-open' : 'state-closed'}>
            {issue.state === 'OPEN' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {issue.state === 'OPEN' ? 'Open' : 'Closed'}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            <Link href={`/${issue.author?.username}`} className="font-semibold text-slate-700 dark:text-slate-300 hover:underline">
              {issue.author?.username || 'unknown'}
            </Link>{' '}
            opened this issue {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })} · {comments.length} comment{comments.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Issue body */}
          <div className="card">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 rounded-t-lg">
              <div className="avatar avatar-sm">{issue.author?.username?.[0]?.toUpperCase() || '?'}</div>
              <Link href={`/${issue.author?.username}`} className="text-sm font-semibold text-slate-900 dark:text-white hover:underline">
                {issue.author?.username}
              </Link>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                commented {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
              </span>
              <span className="badge badge-neutral text-xs ml-auto">Author</span>
            </div>
            <div className="p-4">
              {issue.body ? (
                <div className="markdown-body prose prose-slate dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}>{issue.body}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No description provided.</p>
              )}
            </div>
          </div>

          {/* Comments */}
          {comments.map((comment: any) => (
            <div key={comment.id} className="card">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 rounded-t-lg">
                <div className="avatar avatar-sm">{comment.author?.username?.[0]?.toUpperCase() || '?'}</div>
                <Link href={`/${comment.author?.username}`} className="text-sm font-semibold text-slate-900 dark:text-white hover:underline">
                  {comment.author?.username}
                </Link>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  commented {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
              </div>
              <div className="p-4">
                <div className="markdown-body prose prose-slate dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}>{comment.body}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {/* Add comment */}
          {user ? (
            <div className="space-y-3">
              <MarkdownEditor value={newComment} onChange={setNewComment} placeholder="Leave a comment..." />
              <div className="flex items-center justify-end gap-2">
                {user?.username === issue.author?.username || user?.username === owner ? (
                  <button
                    id="toggle-issue-state"
                    onClick={() => toggleStateMutation.mutate()}
                    disabled={toggleStateMutation.isPending}
                    className={`btn btn-sm ${issue.state === 'OPEN' ? 'btn-secondary text-red-600 dark:text-red-400' : 'btn-secondary text-emerald-600 dark:text-emerald-400'}`}
                  >
                    {issue.state === 'OPEN' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {issue.state === 'OPEN' ? 'Close issue' : 'Reopen issue'}
                  </button>
                ) : null}
                <button
                  id="submit-comment"
                  onClick={() => newComment.trim() && addCommentMutation.mutate(newComment.trim())}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  className="btn btn-primary btn-sm"
                >
                  {addCommentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Comment
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-4 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                <Link href="/login" className="text-link font-medium">Sign in</Link> to comment on this issue.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-6">
          <div className="sidebar-section">
            <h3 className="sidebar-title">Assignees</h3>
            {issue.assignees?.length > 0 ? (
              <div className="space-y-2">
                {issue.assignees.map((a: any) => (
                  <Link key={a.user?.id || a.id} href={`/${a.user?.username}`} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400">
                    <div className="avatar avatar-sm">{(a.user?.username || '?')[0].toUpperCase()}</div>
                    {a.user?.username}
                  </Link>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400 dark:text-slate-500">No one assigned</p>}
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">Labels</h3>
            {issue.labels?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {issue.labels.map((il: any) => {
                  const l = il.label || il;
                  return <LabelBadge key={l.id || l.name} name={l.name} color={l.color} />;
                })}
              </div>
            ) : <p className="text-xs text-slate-400 dark:text-slate-500">None yet</p>}
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">Milestone</h3>
            {issue.milestone ? (
              <div className="text-sm text-slate-700 dark:text-slate-300">
                <MilestoneIcon className="w-4 h-4 inline mr-1 text-slate-400" />
                {issue.milestone.title}
              </div>
            ) : <p className="text-xs text-slate-400 dark:text-slate-500">No milestone</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
