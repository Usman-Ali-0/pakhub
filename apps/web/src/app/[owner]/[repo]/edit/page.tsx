'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { gitApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import { Save, X, FileText, ChevronRight, Loader2 } from 'lucide-react';

export default function EditFilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const owner = params.owner as string;
  const repo = params.repo as string;
  const ref = searchParams.get('ref') || 'main';
  const filePath = searchParams.get('path') || '';
  const isNew = searchParams.get('new') === 'true';

  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState(isNew ? '' : filePath.split('/').pop() || '');
  const [newPath, setNewPath] = useState(isNew ? '' : filePath);
  const [commitMessage, setCommitMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch existing file content (for editing, not creating)
  const { data: blob, isLoading } = useQuery({
    queryKey: ['blob', owner, repo, ref, filePath],
    queryFn: () => gitApi.getBlob(owner, repo, ref, filePath),
    enabled: !isNew && !!filePath,
  });

  useEffect(() => {
    if (blob && !isNew) {
      const decoded = blob.encoding === 'base64'
        ? atob(blob.content)
        : blob.content;
      setContent(decoded);
      setCommitMessage(`Update ${filePath.split('/').pop()}`);
    }
  }, [blob, isNew, filePath]);

  useEffect(() => {
    if (isNew) {
      setCommitMessage('Create new file');
    }
  }, [isNew]);

  const handleSave = async () => {
    const finalPath = isNew ? newPath : filePath;
    if (!finalPath.trim()) {
      toast.error('File path is required');
      return;
    }
    if (!commitMessage.trim()) {
      toast.error('Commit message is required');
      return;
    }

    setSaving(true);
    try {
      const { api } = await import('@/lib/api');
      await api.put(`/git/${owner}/${repo}/contents`, {
        path: finalPath,
        content,
        message: commitMessage,
        branch: ref,
      });
      toast.success(isNew ? 'File created successfully!' : 'File saved successfully!');
      router.push(`/${owner}/${repo}/blob?ref=${ref}&path=${encodeURIComponent(finalPath)}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const pathParts = (isNew ? newPath : filePath).split('/').filter(Boolean);

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm mb-4 flex-wrap">
        <Link href={`/${owner}/${repo}`} className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold">
          {repo}
        </Link>
        <ChevronRight className="w-4 h-4 text-slate-400" />
        {isNew ? (
          <input
            id="new-file-path"
            type="text"
            value={newPath}
            onChange={(e) => {
              setNewPath(e.target.value);
              setFileName(e.target.value.split('/').pop() || '');
            }}
            placeholder="path/to/filename.ext"
            className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm w-72 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        ) : (
          pathParts.map((part, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
              <span className={i === pathParts.length - 1 ? 'font-semibold text-slate-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'}>
                {part}
              </span>
            </span>
          ))
        )}
        <span className="ml-2 text-xs text-slate-500">in <span className="font-medium">{ref}</span></span>
      </div>

      {/* Editor Header */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
          <FileText className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {isNew ? 'Create new file' : `Editing ${fileName}`}
          </span>
        </div>

        {/* Code Editor */}
        <div className="relative">
          <textarea
            id="file-editor-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[500px] p-4 font-mono text-sm leading-6 bg-white dark:bg-[#0d1117] text-slate-900 dark:text-slate-100 border-none outline-none resize-y"
            placeholder={isNew ? 'Enter file content here...' : 'Loading...'}
            spellCheck={false}
          />
          <div className="absolute top-2 right-2 text-xs text-slate-400">
            {content.split('\n').length} lines
          </div>
        </div>
      </div>

      {/* Commit Section */}
      <div className="mt-6 border border-slate-200 dark:border-slate-700 rounded-lg p-5 bg-slate-50 dark:bg-slate-800/50">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          {isNew ? 'Commit new file' : 'Commit changes'}
        </h3>
        <input
          id="commit-message-input"
          type="text"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder={isNew ? 'Create new file' : `Update ${fileName}`}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-3"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Committing directly to the <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{ref}</span> branch.
        </p>
        <div className="flex items-center gap-3">
          <button
            id="commit-changes-btn"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? 'Commit new file' : 'Commit changes'}
          </button>
          <Link
            href={isNew ? `/${owner}/${repo}` : `/${owner}/${repo}/blob?ref=${ref}&path=${encodeURIComponent(filePath)}`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" /> Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
