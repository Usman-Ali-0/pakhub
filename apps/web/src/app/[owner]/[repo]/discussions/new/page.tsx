'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { discussionsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';

export default function NewDiscussionPage({
  params,
}: {
  params: React.Usable<{ owner: string; repo: string }>;
}) {
  const resolvedParams = React.use(params);
  const { owner, repo } = resolvedParams;
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['discussions', owner, repo, 'categories'],
    queryFn: () => discussionsApi.getCategories(owner, repo),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => discussionsApi.create(owner, repo, data),
    onSuccess: (data) => {
      toast.success('Discussion started');
      router.push(`/${owner}/${repo}/discussions/${data.number}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to start discussion');
    },
  });

  const categories = categoriesData || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !categoryId) {
      toast.error('Please fill in all fields');
      return;
    }
    createMutation.mutate({ title, body, categoryId });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 text-slate-800 dark:text-slate-200">
      <h1 className="text-2xl font-bold mb-6">Start a new discussion</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Select category</label>
          {isLoading ? (
            <div className="text-sm text-slate-500">Loading categories...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((cat: any) => (
                <button
                  type="button"
                  key={cat.id}
                  id={`select-category-${cat.id}`}
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex flex-col text-left p-3 rounded-md border transition-colors ${
                    categoryId === cat.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <span>{cat.emoji}</span>
                    <span>{cat.name}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {cat.description}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="title-input" className="block text-sm font-medium mb-2">Title</label>
          <input
            id="title-input"
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Write</label>
          <MarkdownEditor
            value={body}
            onChange={setBody}
            minHeight="200px"
          />
        </div>

        <div className="flex justify-end pt-4">
          <button
            id="start-discussion-btn"
            type="submit"
            disabled={createMutation.isPending || !title.trim() || !body.trim() || !categoryId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
          >
            {createMutation.isPending ? 'Starting...' : 'Start Discussion'}
          </button>
        </div>
      </form>
    </div>
  );
}
