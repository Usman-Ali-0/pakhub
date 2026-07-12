'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tag, Loader2, Info } from 'lucide-react';
import { reposApi, api } from '@/lib/api';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import toast from 'react-hot-toast';

export default function NewReleasePage() {
  const { owner, repo } = useParams();
  const router = useRouter();
  const [tagName, setTagName] = useState('');
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [isPrerelease, setIsPrerelease] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!tagName.trim()) { toast.error('Tag name is required'); return; }
    setSubmitting(true);
    try {
      await api.post(`/repos/${owner}/${repo}/releases`, {
        tagName: tagName.trim(),
        name: name.trim() || tagName.trim(),
        body,
        isDraft,
        isPrerelease,
      });
      toast.success('Release created successfully');
      router.push(`/${owner}/${repo}/releases`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create release');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Draft a new release</h2>
      
      <div className="card p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tag version <span className="text-red-500">*</span></label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={tagName} onChange={e => setTagName(e.target.value)} placeholder="v1.0.0" className="input pl-10" />
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Info className="w-3 h-3" /> Excellent tag names include version numbers</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Release title</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Initial Release" className="input" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Describe this release</label>
          <MarkdownEditor value={body} onChange={setBody} placeholder="What's changed in this release?" minHeight="250px" />
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={isPrerelease} onChange={e => setIsPrerelease(e.target.checked)} className="mt-1 accent-emerald-600 w-4 h-4" />
            <div>
              <span className="block text-sm font-medium text-slate-900 dark:text-white">Set as a pre-release</span>
              <span className="block text-xs text-slate-500">We'll point out that this release is identified as non-production ready.</span>
            </div>
          </label>
          
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={isDraft} onChange={e => setIsDraft(e.target.checked)} className="mt-1 accent-emerald-600 w-4 h-4" />
            <div>
              <span className="block text-sm font-medium text-slate-900 dark:text-white">Save as draft</span>
              <span className="block text-xs text-slate-500">Unpublished releases are visible only to repository collaborators.</span>
            </div>
          </label>
        </div>

        <hr className="border-slate-200 dark:border-slate-700" />

        <div className="flex justify-end gap-3">
          <button onClick={() => router.back()} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !tagName.trim()} className="btn btn-primary">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Publish release
          </button>
        </div>
      </div>
    </div>
  );
}
