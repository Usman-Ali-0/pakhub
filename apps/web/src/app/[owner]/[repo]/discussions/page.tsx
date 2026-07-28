'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { discussionsApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Pin, CheckCircle2, MessageCircle } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import Pagination from '@/components/Pagination';

export default function DiscussionsListPage({
  params,
}: {
  params: React.Usable<{ owner: string; repo: string }>;
}) {
  const resolvedParams = React.use(params);
  const { owner, repo } = resolvedParams;

  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'answered' | 'unanswered'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'comments'>('newest');

  const { data: categoriesData } = useQuery({
    queryKey: ['discussions', owner, repo, 'categories'],
    queryFn: () => discussionsApi.getCategories(owner, repo),
  });

  const { data: discussionsData, isLoading } = useQuery({
    queryKey: ['discussions', owner, repo, page, category, filter, sort],
    queryFn: () =>
      discussionsApi.list(owner, repo, {
        page,
        limit: 10,
        category,
        filter: filter === 'all' ? undefined : filter,
        sort,
      }),
  });

  const categories = categoriesData || [];
  const discussions = discussionsData?.discussions || [];
  const totalPages = discussionsData?.totalPages || 1;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 text-slate-800 dark:text-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Discussions</h1>
        <Link
          href={`/${owner}/${repo}/discussions/new`}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-medium"
        >
          New Discussion
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-1/4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <h2 className="font-semibold p-4 border-b border-slate-200 dark:border-slate-800">Categories</h2>
            <ul className="flex flex-col">
              <li>
                <button
                  id="category-all"
                  onClick={() => {
                    setCategory('');
                    setPage(1);
                  }}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    category === '' ? 'border-l-4 border-emerald-500 bg-slate-50 dark:bg-slate-800' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare size={16} /> All Discussions
                  </span>
                </button>
              </li>
              {categories.map((cat: any) => (
                <li key={cat.id}>
                  <button
                    id={`category-${cat.id}`}
                    onClick={() => {
                      setCategory(cat.id);
                      setPage(1);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      category === cat.id ? 'border-l-4 border-emerald-500 bg-slate-50 dark:bg-slate-800' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{cat.emoji}</span> {cat.name}
                    </span>
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                      {cat.count || 0}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Main List */}
        <div className="w-full md:w-3/4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4 text-sm">
                <button
                  id="filter-all"
                  onClick={() => setFilter('all')}
                  className={`font-medium ${filter === 'all' ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  All
                </button>
                <button
                  id="filter-answered"
                  onClick={() => setFilter('answered')}
                  className={`font-medium ${filter === 'answered' ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Answered
                </button>
                <button
                  id="filter-unanswered"
                  onClick={() => setFilter('unanswered')}
                  className={`font-medium ${filter === 'unanswered' ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Unanswered
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Sort:</span>
                <select
                  id="sort-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="bg-transparent border border-slate-300 dark:border-slate-700 rounded-md p-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="comments">Most commented</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-slate-500">Loading discussions...</div>
            ) : discussions.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No discussions found"
                description="Start a new discussion to get help or share ideas."
                action={{
                  label: 'New Discussion',
                  href: `/${owner}/${repo}/discussions/new`,
                }}
              />
            ) : (
              <div className="flex flex-col">
                {discussions.map((discussion: any) => (
                  <div
                    key={discussion.id}
                    className="p-4 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 flex gap-4"
                  >
                    <div className="pt-1 flex-shrink-0">
                      {discussion.isAnswered ? (
                        <CheckCircle2 size={20} className="text-emerald-500" />
                      ) : (
                        <MessageCircle size={20} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/${owner}/${repo}/discussions/${discussion.number}`}
                          className="font-semibold text-base hover:text-emerald-500 hover:underline truncate"
                        >
                          {discussion.title}
                        </Link>
                        {discussion.pinned && (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400">
                            <Pin size={12} /> Pinned
                          </span>
                        )}
                        {discussion.isAnswered && (
                          <span className="text-xs px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
                            Answered
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">
                        {discussion.category && (
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-xs">
                            <span>{discussion.category.emoji}</span> {discussion.category.name}
                          </span>
                        )}
                        <span>
                          #{discussion.number} opened {formatDistanceToNow(new Date(discussion.createdAt))} ago by{' '}
                          <Link href={`/${discussion.author.username}`} className="hover:text-emerald-500 font-medium">
                            {discussion.author.username}
                          </Link>
                        </span>
                      </div>
                    </div>
                    {discussion.commentCount > 0 && (
                      <div className="flex items-start justify-end flex-shrink-0 text-slate-500 text-sm">
                        <Link
                          href={`/${owner}/${repo}/discussions/${discussion.number}`}
                          className="flex items-center gap-1 hover:text-emerald-500"
                        >
                          <MessageSquare size={16} />
                          {discussion.commentCount}
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
