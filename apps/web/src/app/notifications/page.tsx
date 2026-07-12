'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { Bell, Check, Trash2, Loader2, AlertCircle, GitPullRequest, Star, GitFork, Tag, Eye, Inbox } from 'lucide-react';
import { notificationsApi } from '@/lib/api';
import { Navbar } from '@/components/layout/Navbar';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDistanceToNow } from 'date-fns';
import { useNotificationStore } from '@/store/notification.store';
import toast from 'react-hot-toast';

const TYPE_ICONS: Record<string, any> = {
  ISSUE_OPENED: AlertCircle, ISSUE_CLOSED: AlertCircle, ISSUE_COMMENTED: AlertCircle,
  PR_OPENED: GitPullRequest, PR_CLOSED: GitPullRequest, PR_MERGED: GitPullRequest, PR_REVIEWED: GitPullRequest, PR_COMMENTED: GitPullRequest,
  STAR: Star, FORK: GitFork, RELEASE: Tag, FOLLOW: Eye,
};

export default function NotificationsPage() {
  const { setUnreadCount } = useNotificationStore();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => notificationsApi.list({ filter }),
  });

  const notifications = data?.data || [];

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); setUnreadCount(0); toast.success('All marked as read'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => notificationsApi.clearAll(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); setUnreadCount(0); toast.success('All notifications cleared'); },
  });

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending} className="btn btn-secondary btn-sm">
              <Check className="w-4 h-4" /> Mark all as read
            </button>
            <button onClick={() => clearAllMutation.mutate()} disabled={clearAllMutation.isPending} className="btn btn-ghost btn-sm text-red-500">
              <Trash2 className="w-4 h-4" /> Clear all
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 mb-6">
          <button onClick={() => setFilter('all')} className={filter === 'all' ? 'tab-active' : 'tab-inactive'}>
            <Inbox className="w-4 h-4" /> All
          </button>
          <button onClick={() => setFilter('unread')} className={filter === 'unread' ? 'tab-active' : 'tab-inactive'}>
            <Bell className="w-4 h-4" /> Unread
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : notifications.length === 0 ? (
          <EmptyState icon={Inbox} title="All caught up!" description="You have no notifications." />
        ) : (
          <div className="card divide-y divide-slate-100 dark:divide-slate-700">
            {notifications.map((n: any) => {
              const Icon = TYPE_ICONS[n.type] || Bell;
              return (
                <div key={n.id} className={`flex items-start gap-3 p-4 transition-colors ${!n.isRead ? 'bg-blue-50/30 dark:bg-blue-900/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.isRead ? 'bg-blue-500' : 'bg-transparent'}`} />
                  <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${n.type?.includes('ISSUE') ? 'text-emerald-600' : n.type?.includes('PR') ? 'text-purple-600' : 'text-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <Link href={n.link || '#'} className="text-sm font-medium text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400">
                      {n.title}
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.body}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.isRead && (
                      <button onClick={() => markReadMutation.mutate(n.id)} className="btn btn-ghost btn-xs" title="Mark as read">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => deleteMutation.mutate(n.id)} className="btn btn-ghost btn-xs text-red-400 hover:text-red-600" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
