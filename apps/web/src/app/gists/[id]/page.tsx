'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { gistsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import Navbar from '@/components/layout/Navbar';
import { formatDistanceToNow } from 'date-fns';
import { Star, GitFork, Trash2, Edit2, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const id = params.id as string;
  
  const [gist, setGist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isStarring, setIsStarring] = useState(false);
  const [isForking, setIsForking] = useState(false);

  useEffect(() => {
    if (id) fetchGist();
  }, [id]);

  const fetchGist = async () => {
    try {
      const data = await gistsApi.get(id);
      setGist(data);
    } catch (err) {
      toast.error('Failed to load gist');
      router.push('/gists');
    } finally {
      setLoading(false);
    }
  };

  const handleStar = async () => {
    if (!user) {
      toast.error('Must be logged in to star gists');
      return;
    }
    setIsStarring(true);
    try {
      await gistsApi.toggleStar(id);
      fetchGist(); // Refresh to get new star status/count
    } catch (err) {
      toast.error('Failed to star gist');
    } finally {
      setIsStarring(false);
    }
  };

  const handleFork = async () => {
    if (!user) {
      toast.error('Must be logged in to fork gists');
      return;
    }
    setIsForking(true);
    try {
      const newGist = await gistsApi.fork(id);
      toast.success('Gist forked successfully');
      router.push(`/gists/${newGist.id || newGist._id}`);
    } catch (err) {
      toast.error('Failed to fork gist');
    } finally {
      setIsForking(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this gist?')) {
      try {
        await gistsApi.delete(id);
        toast.success('Gist deleted');
        router.push('/gists');
      } catch (err) {
        toast.error('Failed to delete gist');
      }
    }
  };

  const downloadFile = (filename: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 dark:text-white">
        <Navbar />
        <div className="flex justify-center py-12 text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!gist) return null;

  const isOwner = user && gist.owner && (user.id === gist.owner.id || user._id === gist.owner._id || user.username === gist.owner.username);
  
  // Checking if currently starred requires either checking stars array or a boolean if provided by API
  const hasStarred = gist.hasStarred || (gist.stars && gist.stars.some((s: any) => s.id === user?.id || s._id === user?._id || s === user?._id));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 dark:text-white">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4 border-b dark:border-slate-800 pb-6">
          <div className="flex items-start gap-4">
            <Image 
              src={gist.owner?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${gist.owner?.username}`} 
              alt="Avatar" 
              width={48} 
              height={48} 
              className="rounded-full"
            />
            <div>
              <div className="text-xl">
                <Link href={`/${gist.owner?.username}`} className="text-emerald-600 dark:text-emerald-500 hover:underline font-semibold">
                  {gist.owner?.username}
                </Link>
                <span className="text-slate-500 mx-1">/</span>
                <span className="font-semibold">{gist.files?.[0]?.filename || 'gist'}</span>
              </div>
              <div className="text-sm text-slate-500 mt-1">
                Created {gist.createdAt ? formatDistanceToNow(new Date(gist.createdAt), { addSuffix: true }) : 'recently'}
              </div>
              {gist.description && (
                <p className="mt-2 text-slate-700 dark:text-slate-300">
                  {gist.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {isOwner && (
              <>
                {/* Edit functionality typically needs an edit page, but we'll put a placeholder or just an edit button */}
                <button
                  id="edit-gist-btn"
                  onClick={() => toast('Edit feature coming soon')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md text-sm transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  id="delete-gist-btn"
                  onClick={handleDelete}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-md text-sm transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </>
            )}
            
            <div className="flex border dark:border-slate-700 rounded-md overflow-hidden">
              <button
                id="star-gist-btn"
                onClick={handleStar}
                disabled={isStarring}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors ${
                  hasStarred 
                    ? 'bg-slate-200 dark:bg-slate-700' 
                    : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700'
                }`}
              >
                <Star className={`h-4 w-4 ${hasStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                {hasStarred ? 'Unstar' : 'Star'}
              </button>
              <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border-l dark:border-slate-700 text-sm font-semibold">
                {gist.starCount || gist.stars?.length || 0}
              </div>
            </div>

            <div className="flex border dark:border-slate-700 rounded-md overflow-hidden">
              <button
                id="fork-gist-btn"
                onClick={handleFork}
                disabled={isForking}
                className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm transition-colors"
              >
                <GitFork className="h-4 w-4" />
                Fork
              </button>
              <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border-l dark:border-slate-700 text-sm font-semibold">
                {gist.forkCount || gist.forks?.length || 0}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {gist.files?.map((file: any, idx: number) => (
            <div key={idx} className="border rounded-md overflow-hidden dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-900 px-4 py-2 border-b dark:border-slate-700">
                <span className="font-mono text-sm font-semibold">{file.filename}</span>
                <div className="flex items-center gap-2">
                  <button
                    id={`raw-file-${idx}`}
                    onClick={() => {
                      const newWindow = window.open();
                      if (newWindow) {
                        newWindow.document.write(`<pre>${file.content}</pre>`);
                      }
                    }}
                    className="text-xs px-2 py-1 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border dark:border-slate-600 rounded transition-colors"
                  >
                    Raw
                  </button>
                  <button
                    id={`download-file-${idx}`}
                    onClick={() => downloadFile(file.filename, file.content)}
                    className="p-1 text-slate-500 hover:text-emerald-600 transition-colors"
                    title="Download file"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono border-collapse">
                  <tbody>
                    {file.content?.split('\n').map((line: string, lineIdx: number) => (
                      <tr key={lineIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="w-12 pr-4 py-0.5 text-right text-slate-400 select-none border-r dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                          {lineIdx + 1}
                        </td>
                        <td className="px-4 py-0.5 whitespace-pre font-mono text-slate-800 dark:text-slate-200">
                          {line}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {gist.forks && gist.forks.length > 0 && (
          <div className="mt-12">
            <h3 className="text-xl font-semibold mb-4 border-b dark:border-slate-800 pb-2">Forks</h3>
            <div className="flex flex-wrap gap-4">
              {gist.forks.map((fork: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 p-2 border dark:border-slate-700 rounded-md">
                  <Image 
                    src={fork.owner?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fork.owner?.username}`} 
                    alt="Avatar" 
                    width={24} 
                    height={24} 
                    className="rounded-full"
                  />
                  <Link href={`/gists/${fork.id || fork._id}`} className="text-emerald-600 hover:underline text-sm font-medium">
                    {fork.owner?.username} / {fork.files?.[0]?.filename || 'gist'}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
