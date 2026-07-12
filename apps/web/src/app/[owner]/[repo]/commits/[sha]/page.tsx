'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { GitCommit, Loader2, FolderOpen, Copy, ArrowLeft } from 'lucide-react';
import { gitApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function CommitDetailPage() {
  const { owner, repo, sha } = useParams();

  const { data: commit, isLoading } = useQuery({
    queryKey: ['commit', owner, repo, sha],
    queryFn: () => gitApi.getCommit(owner as string, repo as string, sha as string),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  if (!commit) return <div className="text-center py-20 text-slate-500">Commit not found</div>;

  const files = commit.files || commit.diff?.files || [];
  const totalAdditions = files.reduce((s: number, f: any) => s + (f.additions || 0), 0);
  const totalDeletions = files.reduce((s: number, f: any) => s + (f.deletions || 0), 0);

  return (
    <div className="space-y-4">
      <Link href={`/${owner}/${repo}/commits`} className="text-link text-sm flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to commits
      </Link>

      {/* Commit header */}
      <div className="card p-5">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{commit.message?.split('\n')[0]}</h1>
        {commit.message?.split('\n').slice(1).join('\n').trim() && (
          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap mb-4">{commit.message.split('\n').slice(1).join('\n').trim()}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="avatar avatar-sm">{commit.author?.name?.[0]?.toUpperCase() || '?'}</div>
            <span className="font-medium text-slate-700 dark:text-slate-300">{commit.author?.name}</span>
            <span>committed {formatDistanceToNow(new Date(commit.author?.date || commit.createdAt), { addSuffix: true })}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">commit</span>
            <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{(commit.sha || commit.oid || sha)}</code>
            <button onClick={() => { navigator.clipboard.writeText(commit.sha || commit.oid || sha as string); toast.success('Copied'); }} className="btn btn-ghost btn-xs">
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-700 dark:text-slate-300">Showing <strong>{files.length}</strong> changed file{files.length !== 1 ? 's' : ''}</span>
        <span className="text-emerald-600 font-medium">+{totalAdditions}</span>
        <span className="text-red-500 font-medium">-{totalDeletions}</span>
      </div>

      {/* Diffs */}
      {files.map((file: any, idx: number) => (
        <div key={idx} className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-sm">
            <span className="font-mono text-slate-700 dark:text-slate-300">{file.path || file.filename}</span>
            <span className="flex items-center gap-2 text-xs">
              {file.additions > 0 && <span className="text-emerald-600 font-medium">+{file.additions}</span>}
              {file.deletions > 0 && <span className="text-red-500 font-medium">-{file.deletions}</span>}
            </span>
          </div>
          {file.patch ? (
            <div className="overflow-x-auto code-scroll">
              <table className="w-full text-xs font-mono">
                <tbody>
                  {file.patch.split('\n').map((line: string, li: number) => {
                    const cls = line.startsWith('+') && !line.startsWith('+++') ? 'diff-add' : line.startsWith('-') && !line.startsWith('---') ? 'diff-del' : line.startsWith('@@') ? 'diff-hunk' : '';
                    return (
                      <tr key={li} className={cls}>
                        <td className="code-line-number w-10 text-right pr-2 border-r border-slate-200 dark:border-slate-700">{li + 1}</td>
                        <td className="pl-4 pr-4 py-0 whitespace-pre">{line}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-sm text-slate-500 text-center">Binary file or no diff available</div>
          )}
        </div>
      ))}
    </div>
  );
}
