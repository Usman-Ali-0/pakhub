'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { wikiApi } from '@/lib/api';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { Book } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function NewWikiPage() {
  const params = useParams();
  const owner = params.owner as string;
  const repo = params.repo as string;
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    try {
      setSaving(true);
      const res = await wikiApi.create(owner, repo, { title, content });
      toast.success('Wiki page created');
      router.push(`/${owner}/${repo}/wiki/${res.slug}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create page');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
        <Link href={`/${owner}`} className="hover:text-blue-600 dark:hover:text-blue-400">{owner}</Link>
        <span>/</span>
        <Link href={`/${owner}/${repo}`} className="hover:text-blue-600 dark:hover:text-blue-400 font-medium">{repo}</Link>
        <span>/</span>
        <Link href={`/${owner}/${repo}/wiki`} className="hover:text-blue-600 dark:hover:text-blue-400">Wiki</Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-slate-100 font-semibold">New Page</span>
      </div>
      
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 flex items-center">
          <Book className="w-5 h-5 mr-2 text-emerald-500" />
          Create New Wiki Page
        </h2>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="wiki-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Title
            </label>
            <input
              id="wiki-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
              placeholder="e.g. Home, Installation, API Reference"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Content
            </label>
            <MarkdownEditor 
              value={content} 
              onChange={setContent} 
              placeholder="Write the page content here..."
              minHeight="400px"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Link 
              href={`/${owner}/${repo}/wiki`}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md text-sm font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              id="save-wiki-page-btn"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Page'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
