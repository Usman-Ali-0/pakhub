'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, Trash2, Loader2, Save } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { reposApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function RepoSettingsPage() {
  const { owner, repo } = useParams();
  const router = useRouter();

  const { data: repository, isLoading } = useQuery({
    queryKey: ['repo', owner, repo],
    queryFn: () => reposApi.getRepo(owner as string, repo as string),
  });

  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [description, setDescription] = useState(repository?.description || '');
  const [website, setWebsite] = useState(repository?.website || '');
  const [saving, setSaving] = useState(false);

  const handleDelete = async () => {
    if (deleteText !== `${owner}/${repo}`) {
      toast.error('Please type the full repository name to confirm.');
      return;
    }
    setDeleting(true);
    try {
      await reposApi.deleteRepo(owner as string, repo as string);
      toast.success('Repository deleted successfully.');
      router.push(`/${owner}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete repository');
      setDeleting(false);
    }
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      await reposApi.updateRepo(owner as string, repo as string, { description, website });
      toast.success('Settings saved');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* General Settings */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">General Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Repository name</label>
            <input value={repository?.name || ''} readOnly className="input bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed text-slate-500" />
            <p className="text-xs text-slate-500 mt-1">Renaming is currently not supported via UI.</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="input" placeholder="Short description of this repository" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Website</label>
            <input value={website} onChange={e => setWebsite(e.target.value)} type="url" className="input" placeholder="https://" />
          </div>

          <div className="pt-2">
            <button onClick={handleSaveGeneral} disabled={saving} className="btn btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save changes
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-8">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-500 mb-4 pb-2 border-b border-red-200 dark:border-red-900/50">Danger Zone</h2>
        
        <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-5 bg-red-50 dark:bg-red-900/10">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Delete this repository</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Once you delete a repository, there is no going back. Please be certain.
              </p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-white dark:bg-[#0d1117] border border-red-100 dark:border-red-900/30 rounded-md">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              To confirm, type <span className="font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">{owner}/{repo}</span> in the box below
            </label>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={deleteText}
                onChange={e => setDeleteText(e.target.value)}
                className="input flex-1 border-red-200 dark:border-red-900/50 focus:border-red-500 focus:ring-red-500/20" 
                placeholder={`${owner}/${repo}`}
              />
              <button 
                onClick={handleDelete} 
                disabled={deleting || deleteText !== `${owner}/${repo}`}
                className="btn bg-red-600 hover:bg-red-700 text-white border-0 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} 
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
