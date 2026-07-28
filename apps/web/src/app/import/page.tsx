'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Upload, GitBranch, Loader2, ArrowRight } from 'lucide-react';
import { reposApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

export default function ImportPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [repoName, setRepoName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117]">
        <Navbar />
        <div className="pt-32 text-center">
          <p className="text-slate-500 mb-4">Please sign in to import a repository.</p>
          <Link href="/login" className="btn btn-primary">Sign in</Link>
        </div>
      </div>
    );
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoName.trim()) { toast.error('Repository name required'); return; }
    if (!file) { toast.error('Please select a .zip file'); return; }

    setLoading(true);
    try {
      await reposApi.createRepo({ name: repoName.trim(), description, isPrivate });
      await reposApi.uploadFile(user.username, repoName.trim(), file, 'main', 'Initial import from zip');
      toast.success('Repository imported successfully!');
      router.push(`/${user.username}/${repoName.trim()}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <Upload className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Import repository</h1>
            <p className="text-sm text-slate-500">Upload a ZIP file to create a new repository instantly</p>
          </div>
        </div>

        <form onSubmit={handleImport} className="card p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Owner</label>
            <input value={user.username} readOnly className="input bg-slate-50 dark:bg-slate-900" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Repository name <span className="text-red-500">*</span>
            </label>
            <input
              value={repoName}
              onChange={e => setRepoName(e.target.value.replace(/[^a-zA-Z0-9._-]/g, '-'))}
              placeholder="my-awesome-project"
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" className="input" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="rounded" />
            <span className="text-sm text-slate-700 dark:text-slate-300">Make this repository private</span>
          </label>

          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center">
            {file ? (
              <div>
                <GitBranch className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-medium text-slate-900 dark:text-white">{file.name}</p>
                <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button type="button" onClick={() => setFile(null)} className="text-xs text-red-500 mt-2 hover:underline">Remove</button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Drop your .zip file here or click to browse</p>
                <p className="text-xs text-slate-500 mt-1">Max 100MB</p>
                <input type="file" accept=".zip" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link href="/new" className="btn btn-secondary">Cancel</Link>
            <button type="submit" disabled={loading || !file} className="btn btn-primary">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Import repository
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
