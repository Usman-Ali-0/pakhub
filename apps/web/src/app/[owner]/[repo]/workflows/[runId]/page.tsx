'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle, XCircle, Clock, ArrowLeft, GitBranch } from 'lucide-react';
import { workflowsApi } from '@/lib/api';
import { useTranslation } from '@/i18n/I18nProvider';
import { formatDistanceToNow } from 'date-fns';

const STATUS_ICON: Record<string, React.ReactNode> = {
  SUCCESS: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  FAILURE: <XCircle className="w-5 h-5 text-red-500" />,
  IN_PROGRESS: <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />,
  QUEUED: <Clock className="w-5 h-5 text-amber-500" />,
  PENDING: <Clock className="w-5 h-5 text-slate-400" />,
};

export default function WorkflowRunPage() {
  const { owner, repo, runId } = useParams();
  const { t } = useTranslation();

  const { data: run, isLoading } = useQuery({
    queryKey: ['workflow-run', owner, repo, runId],
    queryFn: () => workflowsApi.getRun(owner as string, repo as string, runId as string),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'IN_PROGRESS' || status === 'QUEUED' ? 3000 : false;
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  if (!run) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">{t.common.notFound}</p>
        <Link href={`/${owner}/${repo}/workflows`} className="btn btn-primary mt-4">Back to workflows</Link>
      </div>
    );
  }

  return (
    <div>
      <Link href={`/${owner}/${repo}/workflows`} className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to workflows
      </Link>

      <div className="flex items-start gap-4 mb-6">
        {STATUS_ICON[run.status]}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {run.workflow?.name} #{run.runNumber}
          </h2>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-3">
            <span>{t.workflow.status}: <strong>{run.status}</strong></span>
            {run.branch && <span className="flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" /> {run.branch}</span>}
            <span>{t.workflow.trigger}: {run.trigger}</span>
            <span>{formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}</span>
          </p>
          {run.commitMsg && <p className="text-xs text-slate-400 mt-1 font-mono">{run.commitSha?.slice(0, 7)} — {run.commitMsg}</p>}
        </div>
      </div>

      {/* Jobs */}
      <div className="space-y-4 mb-6">
        {run.jobs?.map((job: { id: string; name: string; status: string; logs?: string; startedAt?: string; completedAt?: string }) => (
          <div key={job.id} className="card overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              {STATUS_ICON[job.status] || STATUS_ICON.PENDING}
              <span className="font-medium text-sm text-slate-900 dark:text-white">{job.name}</span>
              <span className="text-xs text-slate-500 ml-auto">{job.status}</span>
            </div>
            {job.logs && (
              <pre className="p-4 text-xs font-mono text-slate-300 bg-[#0d1117] overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                {job.logs}
              </pre>
            )}
          </div>
        ))}
      </div>

      {/* Overall logs */}
      {run.logs && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full logs</h3>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-300 bg-[#0d1117] overflow-x-auto whitespace-pre-wrap max-h-[500px] overflow-y-auto">
            {run.logs}
          </pre>
        </div>
      )}
    </div>
  );
}
