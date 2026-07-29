'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { gistsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Navbar } from '@/components/layout/Navbar';
import { Pagination } from '@/components/ui/Pagination';
import { formatDistanceToNow } from 'date-fns';
import { Search, Plus, Star, GitFork, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GistsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [gists, setGists] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchGists = async () => {
    setLoading(true);
    try {
      if (activeTab === 'my' && user) {
        const res = await gistsApi.myGists();
        // Assume myGists returns array directly, wrap for pagination or just show all
        setGists(res);
        setTotalPages(1);
      } else {
        const res = await gistsApi.list({ page, limit: 20, q: search });
        // Handle paginated response
        if (res.items) {
          setGists(res.items);
          setTotalPages(res.totalPages || 1);
        } else if (Array.isArray(res)) {
          setGists(res);
          setTotalPages(1);
        } else {
          setGists([]);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load gists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGists();
  }, [activeTab, page]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 dark:text-white">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold">Discover Gists</h1>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="gist-search"
                type="text"
                placeholder="Search gists..."
                className="w-full pl-9 pr-4 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchGists()}
              />
            </div>
            <Link 
              href="/gists/new"
              id="create-gist-btn"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md transition-colors whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Create Gist
            </Link>
          </div>
        </div>

        <div className="flex gap-6 border-b dark:border-slate-800 mb-6">
          <button
            id="tab-all-gists"
            className={`pb-2 px-1 ${activeTab === 'all' ? 'border-b-2 border-emerald-500 font-medium' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => { setActiveTab('all'); setPage(1); }}
          >
            All Gists
          </button>
          {user && (
            <button
              id="tab-my-gists"
              className={`pb-2 px-1 ${activeTab === 'my' ? 'border-b-2 border-emerald-500 font-medium' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              onClick={() => { setActiveTab('my'); setPage(1); }}
            >
              My Gists
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-slate-500">Loading gists...</div>
        ) : (
          <div className="space-y-6">
            {gists.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 border rounded-lg dark:border-slate-800 bg-white dark:bg-slate-900">
                No gists found.
              </div>
            ) : (
              gists.map((gist) => (
                <div key={gist.id || gist._id} className="border rounded-lg p-5 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <Image 
                        src={gist.owner?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${gist.owner?.username}`} 
                        alt="Avatar" 
                        width={40} 
                        height={40} 
                        className="rounded-full"
                      />
                      <div>
                        <Link href={`/gists/${gist.id || gist._id}`} className="text-emerald-600 dark:text-emerald-500 hover:underline font-medium text-lg">
                          {gist.owner?.username} / {gist.files?.[0]?.filename || 'gist'}
                        </Link>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          Created {gist.createdAt ? formatDistanceToNow(new Date(gist.createdAt), { addSuffix: true }) : 'recently'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1" title="Files">
                        <FileCode className="h-4 w-4" />
                        <span>{gist.files?.length || 0}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Stars">
                        <Star className="h-4 w-4" />
                        <span>{gist.starCount || gist.stars?.length || 0}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Forks">
                        <GitFork className="h-4 w-4" />
                        <span>{gist.forkCount || gist.forks?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  {gist.description && (
                    <p className="mb-4 text-slate-700 dark:text-slate-300">
                      {gist.description}
                    </p>
                  )}
                  
                  {gist.files && gist.files[0] && (
                    <div className="mt-4 rounded-md overflow-hidden border dark:border-slate-700">
                      <div className="bg-slate-100 dark:bg-slate-900 px-4 py-2 text-sm font-mono border-b dark:border-slate-700">
                        {gist.files[0].filename}
                      </div>
                      <pre className="p-4 bg-white dark:bg-slate-950 text-sm overflow-x-auto text-slate-800 dark:text-slate-200">
                        <code>
                          {gist.files[0].content?.split('\n').slice(0, 5).join('\n') || ''}
                          {(gist.files[0].content?.split('\n').length > 5) && '\n...'}
                        </code>
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination 
                  currentPage={page} 
                  totalPages={totalPages} 
                  onPageChange={setPage} 
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
