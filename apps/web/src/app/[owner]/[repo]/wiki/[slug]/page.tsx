'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { wikiApi } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Book, Edit, History, FileText } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import 'highlight.js/styles/github-dark.css';

export default function WikiPage() {
  const params = useParams();
  const owner = params.owner as string;
  const repo = params.repo as string;
  const slug = params.slug as string;
  
  const [pages, setPages] = useState<any[]>([]);
  const [page, setPage] = useState<any>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pagesList, pageData, revs] = await Promise.all([
          wikiApi.list(owner, repo).catch(() => []),
          wikiApi.getPage(owner, repo, slug).catch(() => null),
          wikiApi.getRevisions(owner, repo, slug).catch(() => [])
        ]);
        
        setPages(pagesList || []);
        setPage(pageData);
        setRevisions(revs || []);
      } catch (err) {
        console.error('Failed to fetch wiki data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [owner, repo, slug]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading wiki page...</div>;
  }

  if (!page) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8 text-center">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">Page Not Found</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">The wiki page '{slug}' does not exist.</p>
        <Link href={`/${owner}/${repo}/wiki`} className="text-emerald-600 hover:underline">
          Return to Wiki Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-8">
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{page.title}</h1>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Last edited {page.updatedAt ? formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true }) : 'recently'}
              {page.author?.username && ` by ${page.author.username}`}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
             <Link id="edit-page-btn" href={`/${owner}/${repo}/wiki/${slug}/edit`} className="inline-flex items-center px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium rounded-md transition-colors text-slate-700 dark:text-slate-300">
               <Edit className="w-4 h-4 mr-1.5" />
               Edit
             </Link>
             <button id="history-page-btn" className="inline-flex items-center px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium rounded-md transition-colors text-slate-700 dark:text-slate-300">
               <History className="w-4 h-4 mr-1.5" />
               {revisions.length} {revisions.length === 1 ? 'Revision' : 'Revisions'}
             </button>
          </div>
        </div>
        
        <div className="prose dark:prose-invert max-w-none prose-emerald">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {page.content}
          </ReactMarkdown>
        </div>
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
                className={`flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${
                  p.slug === slug 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium' 
                    : 'text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <FileText className={`w-4 h-4 mr-2 ${p.slug === slug ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400'}`} />
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
