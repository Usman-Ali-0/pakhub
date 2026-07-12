'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Tag, Download, Loader2, Plus, Package } from 'lucide-react';
import { reposApi } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuthStore } from '@/store/auth.store';

export default function ReleasesPage() {
  const { owner, repo } = useParams();
  const { user } = useAuthStore();

  const { data: releases = [], isLoading } = useQuery({
    queryKey: ['releases', owner, repo],
    queryFn: async () => {
      try {
        const res = await reposApi.getReleases?.(owner as string, repo as string);
        return res?.data || res || [];
      } catch { return []; }
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  if (releases.length === 0) {
    return (
      <EmptyState icon={Package} title="No releases yet"
        description="Releases are deployable software iterations you can package and provide to users."
        action={user?.username === owner ? { label: 'Create release', href: `/${owner}/${repo}/releases/new` } : undefined} />
    );
  }

  return (
    <div className="space-y-6">
      {user?.username === owner && (
        <div className="flex justify-end">
          <Link href={`/${owner}/${repo}/releases/new`} className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Draft a new release
          </Link>
        </div>
      )}

      {releases.map((release: any, idx: number) => (
        <div key={release.id || idx} className="card overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Left - tag info */}
            <div className="lg:w-48 flex-shrink-0 px-5 py-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-mono font-semibold text-sm text-emerald-600 dark:text-emerald-400">{release.tagName}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {formatDistanceToNow(new Date(release.createdAt), { addSuffix: true })}
              </p>
            </div>

            {/* Right - content */}
            <div className="flex-1 px-5 py-5">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{release.name || release.tagName}</h3>
                {idx === 0 && <span className="badge badge-success">Latest</span>}
                {release.isPrerelease && <span className="badge badge-warning">Pre-release</span>}
              </div>

              {release.author && (
                <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
                  <div className="avatar avatar-sm">{release.author.username?.[0]?.toUpperCase()}</div>
                  <Link href={`/${release.author.username}`} className="font-medium text-slate-700 dark:text-slate-300 hover:underline">
                    {release.author.username}
                  </Link>
                  <span>released this</span>
                </div>
              )}

              {release.body && (
                <div className="markdown-body prose prose-slate dark:prose-invert max-w-none mb-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{release.body}</ReactMarkdown>
                </div>
              )}

              {release.assets?.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Assets</h4>
                  <div className="space-y-1.5">
                    {release.assets.map((asset: any) => (
                      <a key={asset.name} href={asset.downloadUrl} className="flex items-center gap-2 text-sm text-link py-1">
                        <Download className="w-4 h-4" /> {asset.name}
                        <span className="text-xs text-slate-400">({(asset.size / 1024 / 1024).toFixed(1)} MB)</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
