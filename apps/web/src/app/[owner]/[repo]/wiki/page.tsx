'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { wikiApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Book, Plus, Edit, FileText } from 'lucide-react';
import Link from 'next/link';
import 'highlight.js/styles/github-dark.css';

export default function WikiHomePage() {
  const params = useParams();
  const owner = params.owner as string;
  const repo = params.repo as string;
  
  const [pages, setPages] = useState<any[]>([]);
  const [homePage, setHomePage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuthStore();
  const isOwner = user?.username === owner; // Simplified check

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pagesList = await wikiApi.list(owner, repo);
        setPages(pagesList || []);
        
        if (pagesList && pagesList.length > 0) {
          try {
            const home = await wikiApi.getPage(owner, repo, 'home');
            setHomePage(home);
          } catch (e) {
            setHomePage(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch wiki data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [owner, repo]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading wiki...</div>;
  }

  if (pages.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
          <Link href={`/${owner}`} className="hover:text-blue-600 dark:hover:text-blue-400">{owner}</Link>
          <span>/</span>
          <Link href={`/${owner}/${repo}`} className="hover:text-blue-600 dark:hover:text-blue-400 font-medium">{repo}</Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-slate-100 font-semibold">Wiki</span>
        </div>
        
        <div className="text-center py-20 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/50">
          <Book className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Welcome to the wiki!</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Create the first page to get started.</p>
          {isOwner && (
            <Link id="create-first-page-btn" href={`/${owner}/${repo}/wiki/new`} className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium transition-colors">
              <Plus className="w-4 h-4 mr-2" />
              Create the first page
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-8">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400 truncate">
            <Link href={`/${owner}`} className="hover:text-blue-600 dark:hover:text-blue-400">{owner}</Link>
            <span>/</span>
            <Link href={`/${owner}/${repo}`} className="hover:text-blue-600 dark:hover:text-blue-400 font-medium">{repo}</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">Wiki</span>
          </div>
          <div className="flex gap-2 shrink-0">
             {homePage && (
              <Link id="edit-home-btn" href={`/${owner}/${repo}/wiki/${homePage.slug}/edit`} className="inline-flex items-center px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium rounded-md transition-colors text-slate-700 dark:text-slate-300">
                <Edit className="w-4 h-4 mr-1.5" />
                Edit
              </Link>
             )}
            {isOwner && (
              <Link id="new-page-btn" href={`/${owner}/${repo}/wiki/new`} className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors">
                <Plus className="w-4 h-4 mr-1.5" />
                New Page
              </Link>
            )}
          </div>
        </div>
        
        {homePage ? (
          <div className="prose dark:prose-invert max-w-none prose-emerald">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {homePage.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-12">
             <h2 className="text-xl font-medium text-slate-700 dark:text-slate-300">Home page not found</h2>
             <p className="text-slate-500 dark:text-slate-400 mt-2">Select a page from the sidebar.</p>
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="w-full md:w-64 shrink-0">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center border-b border-slate-200 dark:border-slate-800 pb-2">
          <Book className="w-4 h-4 mr-2 text-slate-500" />
          Pages
        </h3>
        <ul className="space-y-1">
          {pages.map((p) => (
            <li key={p.slug}>
              <Link 
                href={`/${owner}/${repo}/wiki/${p.slug}`}
                className="flex items-center px-2 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-md"
              >
                <FileText className="w-4 h-4 mr-2 text-slate-400" />
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
