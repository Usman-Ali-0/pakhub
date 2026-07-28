'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import {
  Play, RefreshCw, Plus, Loader2, CheckCircle, XCircle,
  Clock, GitBranch, Zap, Trash2,
} from 'lucide-react';
import { workflowsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useTranslation } from '@/i18n/I18nProvider';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_ICON: Record<string, React.ReactNode> = {
  SUCCESS: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  FAILURE: <XCircle className="w-4 h-4 text-red-500" />,
  IN_PROGRESS: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
  QUEUED: <Clock className="w-4 h-4 text-amber-500" />,
  PENDING: <Clock className="w-4 h-4 text-slate-400" />,
  CANCELLED: <XCircle className="w-4 h-4 text-slate-400" />,
};

const DEFAULT_WORKFLOW = `name: CI Pipeline
on:
  push:
    branches: [main]
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Install dependencies
        run: npm install || echo "No package.json"
      - name: Run tests
        run: npm test || echo "No tests configured"
      - name: Build
        run: npm run build || echo "No build script"
`;

export default function WorkflowsPage() {
  const { owner, repo } = useParams();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [wfName, setWfName] = useState('CI Pipeline');
  const [wfContent, setWfContent] = useState(DEFAULT_WORKFLOW);
  const isOwner = user?.username === owner;

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['workflows', owner, repo],
    queryFn: () => workflowsApi.list(owner as string, repo as string),
  });

  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: ['workflow-runs', owner, repo],
    queryFn: () => workflowsApi.listRuns(owner as string, repo as string),
    refetchInterval: 5000,
  });

  const runs = runsData?.data || [];

  const syncMutation = useMutation({
    mutationFn: () => workflowsApi.sync(owner as string, repo as string),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['workflows', owner, repo] });
      toast.success(`Synced ${data.synced} workflow(s) from repository`);
    },
    onError: () => toast.error('Sync failed'),
  });

  const runMutation = useMutation({
    mutationFn: (workflowId: string) => workflowsApi.run(owner as string, repo as string, workflowId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['workflow-runs', owner, repo] });
      toast.success('Workflow triggered!');
      if (data.runId) router.push(`/${owner}/${repo}/workflows/${data.runId}`);
    },
    onError: () => toast.error('Failed to trigger workflow'),
  });

  const createMutation = useMutation({
    mutationFn: () => workflowsApi.create(owner as string, repo as string, {
      name: wfName,
      filename: `${wfName.toLowerCase().replace(/\s+/g, '-')}.yml`,
      content: wfContent,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows', owner, repo] });
      toast.success('Workflow created!');
      setShowCreate(false);
    },
    onError: () => toast.error('Failed to create workflow'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workflowsApi.delete(owner as string, repo as string, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows', owner, repo] });
      toast.success('Workflow deleted');
    },
  });

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      SUCCESS: t.workflow.success,
      FAILURE: t.workflow.failure,
      IN_PROGRESS: t.workflow.inProgress,
      QUEUED: t.workflow.queued,
      PENDING: t.workflow.pending,
      CANCELLED: t.workflow.cancelled,
    };
    return map[status] || status;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" /> {t.workflow.title}
          </h2>
          <p className="text-sm text-slate-500 mt-1">GitHub Actions-compatible CI/CD pipelines</p>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className="btn btn-secondary btn-sm">
              {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {t.workflow.syncWorkflows}
            </button>
            <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" /> {t.workflow.newWorkflow}
            </button>
          </div>
        )}
      </div>

      {showCreate && isOwner && (
        <div className="card p-6 mb-6 animate-slide-down">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{t.workflow.newWorkflow}</h3>
          <div className="space-y-3">
            <input value={wfName} onChange={e => setWfName(e.target.value)} placeholder="Workflow name" className="input" />
            <textarea value={wfContent} onChange={e => setWfContent(e.target.value)} rows={14}
              className="input font-mono text-xs" spellCheck={false} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="btn btn-secondary btn-sm">{t.common.cancel}</button>
              <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="btn btn-primary btn-sm">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {t.common.create}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflows list */}
      <div className="card mb-6 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Configured Workflows</h3>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : workflows.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Zap className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>{t.workflow.noWorkflows}</p>
            <p className="text-xs mt-1">Add workflows in <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">.pakhub/workflows/</code> or <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">.github/workflows/</code></p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {workflows.map((wf: { id: string; name: string; filename: string; triggers: string[]; runs?: Array<{ status: string }>; _count?: { runs: number } }) => (
              <div key={wf.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <Zap className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 dark:text-white">{wf.name}</p>
                  <p className="text-xs text-slate-500">{wf.filename} · Triggers: {wf.triggers?.join(', ') || 'push'}</p>
                </div>
                {wf.runs?.[0] && STATUS_ICON[wf.runs[0].status]}
                {isOwner && (
                  <div className="flex gap-1">
                    <button onClick={() => runMutation.mutate(wf.id)} disabled={runMutation.isPending}
                      className="btn btn-secondary btn-xs" title={t.workflow.runWorkflow}>
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(wf.id)} className="btn btn-ghost btn-xs text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent runs */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.workflow.runs}</h3>
        </div>
        {runsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : runs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">{t.workflow.noRuns}</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {runs.map((run: { id: string; runNumber: number; status: string; trigger: string; branch?: string; createdAt: string; workflow?: { name: string } }) => (
              <Link key={run.id} href={`/${owner}/${repo}/workflows/${run.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                {STATUS_ICON[run.status]}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {run.workflow?.name || 'Workflow'} #{run.runNumber}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <span>{statusLabel(run.status)}</span>
                    {run.branch && <><GitBranch className="w-3 h-3" /> {run.branch}</>}
                    <span>· {run.trigger}</span>
                  </p>
                </div>
                <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
