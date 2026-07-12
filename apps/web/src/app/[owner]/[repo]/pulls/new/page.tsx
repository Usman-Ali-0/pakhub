'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { GitPullRequest, ArrowRight, Loader2, GitCommit, FileText } from 'lucide-react';
import { pullsApi, reposApi, gitApi } from '@/lib/api';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

export default function NewPRPage() {
  const { owner, repo } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [baseBranch, setBaseBranch] = useState('main');
  const [headBranch, setHeadBranch] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches', owner, repo],
    queryFn: () => reposApi.getBranches(owner as string, repo as string),
  });

  const branchNames = branches.map((b: any) => b.name || b);

  const { data: comparison } = useQuery({
    queryKey: ['compare', owner, repo, baseBranch, headBranch],
    queryFn: () => gitApi.compare(owner as string, repo as string, baseBranch, headBranch),
    enabled: !!headBranch && headBranch !== baseBranch,
  });

  const handleSubmit = async () => {
    if (!title.trim() || !headBranch) { toast.error('Title and head branch required'); return; }
    setSubmitting(true);
    try {
      const pr = await pullsApi.create(owner as string, repo as string, { title: title.trim(), body: body.trim(), headBranch, baseBranch, isDraft });
      toast.success('Pull request created');
      router.push(`/${owner}/${repo}/pulls/${pr.number}`);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to create PR'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">New Pull Request</h2>

      {/* Branch selectors */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Base</label>
            <select value={baseBranch} onChange={e => setBaseBranch(e.target.value)} className="input text-sm w-40">
              {branchNames.map((b: string) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 mt-5" />
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Compare</label>
            <select value={headBranch} onChange={e => { setHeadBranch(e.target.value); if (!title) setTitle(e.target.value.replace(/[-_]/g, ' ')); }} className="input text-sm w-40">
              <option value="">Select branch</option>
              {branchNames.filter((b: string) => b !== baseBranch).map((b: string) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {comparison && (
          <div className="mt-4 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><GitCommit className="w-4 h-4" /> {comparison.commits?.length || 0} commits</span>
            <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> {comparison.files?.length || 0} files changed</span>
          </div>
        )}
      </div>

      {headBranch && headBranch !== baseBranch && (
        <div className="space-y-4">
          <input id="pr-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="input text-lg font-medium" autoFocus />
          <MarkdownEditor value={body} onChange={setBody} placeholder="Describe your changes..." minHeight="200px" />

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input type="checkbox" checked={isDraft} onChange={e => setIsDraft(e.target.checked)} className="accent-emerald-600 w-4 h-4" />
              Create as draft
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => router.back()} className="btn btn-secondary">Cancel</button>
            <button id="create-pr" onClick={handleSubmit} disabled={submitting || !title.trim()} className="btn btn-primary">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitPullRequest className="w-4 h-4" />}
              {isDraft ? 'Create draft pull request' : 'Create pull request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
