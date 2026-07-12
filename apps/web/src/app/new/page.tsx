'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BookOpen, Lock, Globe, Loader2, FileText, Shield, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { reposApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

const GITIGNORE_TEMPLATES = ['', 'Node', 'Python', 'Go', 'Rust', 'Java', 'Ruby', 'C++', 'Swift', 'Kotlin', 'Dart'];
const LICENSE_OPTIONS = ['', 'MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'MPL-2.0', 'Unlicense'];

export default function NewRepoPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [initReadme, setInitReadme] = useState(true);
  const [gitignore, setGitignore] = useState('');
  const [license, setLicense] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');

  const validateName = (n: string) => {
    if (!n) { setNameError(''); return; }
    if (!/^[a-zA-Z0-9._-]+$/.test(n)) { setNameError('Name can only contain letters, numbers, hyphens, dots, and underscores'); return; }
    setNameError('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Repository name is required'); return; }
    if (nameError) return;
    setSubmitting(true);
    try {
      const repo = await reposApi.createRepo({ name: name.trim(), description: description.trim(), isPrivate, initReadme, gitignore, license });
      toast.success('Repository created!');
      router.push(`/${user?.username}/${repo.name}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create repository');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-12">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Create a new repository</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          A repository contains all project files, including the revision history.
        </p>

        <div className="space-y-6">
          {/* Owner + Name */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Owner</label>
              <div className="input flex items-center gap-2 bg-slate-50 dark:bg-slate-800 cursor-not-allowed">
                <div className="avatar avatar-sm">{user?.username?.[0]?.toUpperCase()}</div>
                <span className="text-sm">{user?.username}</span>
              </div>
            </div>
            <span className="text-xl text-slate-300 dark:text-slate-600 pb-2 font-light">/</span>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Repository name <span className="text-red-500">*</span></label>
              <input id="repo-name" type="text" value={name} onChange={e => { setName(e.target.value); validateName(e.target.value); }}
                placeholder="my-awesome-project" className={`input ${nameError ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500' : ''}`} autoFocus />
              {nameError && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{nameError}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description <span className="text-slate-400">(optional)</span></label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description of your repository" className="input" />
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Visibility */}
          <div className="space-y-3">
            <button onClick={() => setIsPrivate(false)}
              className={`flex items-start gap-3 w-full text-left p-4 rounded-lg border-2 transition-colors ${!isPrivate ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
              <Globe className={`w-5 h-5 mt-0.5 ${!isPrivate ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div>
                <p className="font-medium text-sm text-slate-900 dark:text-white">Public</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Anyone on the internet can see this repository. You choose who can commit.</p>
              </div>
            </button>
            <button onClick={() => setIsPrivate(true)}
              className={`flex items-start gap-3 w-full text-left p-4 rounded-lg border-2 transition-colors ${isPrivate ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
              <Lock className={`w-5 h-5 mt-0.5 ${isPrivate ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div>
                <p className="font-medium text-sm text-slate-900 dark:text-white">Private</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">You choose who can see and commit to this repository.</p>
              </div>
            </button>
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          {/* Initialize */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Initialize this repository with:</h3>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer mb-3">
              <input type="checkbox" checked={initReadme} onChange={e => setInitReadme(e.target.checked)} className="accent-emerald-600 w-4 h-4" />
              <FileText className="w-4 h-4 text-slate-400" /> Add a README file
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Add .gitignore</label>
                <select value={gitignore} onChange={e => setGitignore(e.target.value)} className="input text-sm">
                  <option value="">None</option>
                  {GITIGNORE_TEMPLATES.slice(1).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Choose a license</label>
                <select value={license} onChange={e => setLicense(e.target.value)} className="input text-sm">
                  <option value="">None</option>
                  {LICENSE_OPTIONS.slice(1).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />

          <button id="create-repo" onClick={handleSubmit} disabled={submitting || !name.trim() || !!nameError} className="btn btn-primary w-full">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            Create repository
          </button>
        </div>
      </div>
    </div>
  );
}
