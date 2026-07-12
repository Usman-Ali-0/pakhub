'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Tag } from 'lucide-react';
import { issuesApi } from '@/lib/api';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { LabelBadge } from '@/components/ui/LabelBadge';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

export default function NewIssuePage() {
  const { owner, repo } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: labels = [] } = useQuery({
    queryKey: ['labels', owner, repo],
    queryFn: () => issuesApi.getLabels(owner as string, repo as string),
  });

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSubmitting(true);
    try {
      const issue = await issuesApi.create(owner as string, repo as string, { title: title.trim(), body: body.trim(), labels: selectedLabels });
      toast.success('Issue created');
      router.push(`/${owner}/${repo}/issues/${issue.number}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create issue');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLabel = (id: string) => {
    setSelectedLabels(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  };

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 dark:text-slate-400">You must be signed in to create an issue.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">New Issue</h2>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0 space-y-4">
          <input
            id="issue-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="input text-lg font-medium"
            autoFocus
          />
          <MarkdownEditor value={body} onChange={setBody} placeholder="Leave a comment..." minHeight="250px" />
          <div className="flex items-center justify-end gap-3">
            <button onClick={() => router.back()} className="btn btn-secondary btn-sm">Cancel</button>
            <button
              id="submit-issue"
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
              className="btn btn-primary"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Submit new issue
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-6">
          <div className="sidebar-section">
            <h3 className="sidebar-title">Labels</h3>
            <div className="space-y-1.5">
              {labels.map((label: any) => (
                <button
                  key={label.id}
                  onClick={() => toggleLabel(label.id)}
                  className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                    selectedLabels.includes(label.id)
                      ? 'bg-slate-100 dark:bg-slate-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: label.color, borderColor: label.color }} />
                  <span className="text-slate-700 dark:text-slate-300 flex-1">{label.name}</span>
                  {selectedLabels.includes(label.id) && <span className="text-emerald-600 dark:text-emerald-400 text-xs">✓</span>}
                </button>
              ))}
              {labels.length === 0 && <p className="text-xs text-slate-400">No labels</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
