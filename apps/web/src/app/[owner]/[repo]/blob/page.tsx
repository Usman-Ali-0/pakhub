'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Copy, Download, FileText, Loader2, ChevronRight, CheckCircle, History, Code2 } from 'lucide-react';
import { gitApi } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const LANG_MAP: Record<string, string> = {
  js: 'javascript', ts: 'typescript', tsx: 'typescript', jsx: 'javascript',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
  css: 'css', html: 'html', json: 'json', md: 'markdown', yml: 'yaml', yaml: 'yaml',
  sh: 'bash', bash: 'bash', sql: 'sql', c: 'c', cpp: 'cpp', h: 'c',
  cs: 'csharp', php: 'php', swift: 'swift', kt: 'kotlin', dart: 'dart',
  dockerfile: 'dockerfile', toml: 'toml', xml: 'xml', svg: 'xml',
};

export default function BlobPage() {
  const { owner, repo } = useParams();
  const searchParams = useSearchParams();
  const path = searchParams.get('path') || '';
  const ref = searchParams.get('ref') || 'HEAD';
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const { data: blob, isLoading } = useQuery({
    queryKey: ['blob', owner, repo, ref, path],
    queryFn: () => gitApi.getBlob(owner as string, repo as string, ref, path),
    enabled: !!path,
  });

  const { data: commits } = useQuery({
    queryKey: ['blob-commits', owner, repo, ref, path],
    queryFn: () => gitApi.getCommits(owner as string, repo as string, ref, { limit: 1, path }),
    enabled: !!path,
  });

  const filename = path.split('/').pop() || '';
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const isMarkdown = ['md', 'mdx', 'markdown'].includes(ext);
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext);
  const lang = LANG_MAP[ext] || ext;
  const lines = blob?.content?.split('\n') || [];
  const latestCommit = commits?.[0];

  const pathParts = path.split('/').filter(Boolean);

  const handleCopy = () => {
    navigator.clipboard.writeText(blob?.content || '');
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  if (!blob) return <div className="text-center py-20 text-slate-500">File not found</div>;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm flex-wrap">
        <Link href={`/${owner}/${repo}`} className="text-link font-semibold">{repo}</Link>
        {pathParts.map((part, i) => {
          const isLast = i === pathParts.length - 1;
          const partPath = pathParts.slice(0, i + 1).join('/');
          return (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              {isLast ? (
                <span className="font-semibold text-slate-900 dark:text-white">{part}</span>
              ) : (
                <Link href={`/${owner}/${repo}?ref=${ref}&path=${partPath}`} className="text-link">{part}</Link>
              )}
            </span>
          );
        })}
      </div>

      {/* Latest commit */}
      {latestCommit && (
        <div className="card px-4 py-3 flex items-center gap-3 text-sm">
          <div className="avatar avatar-sm">{latestCommit.author?.name?.[0]?.toUpperCase() || '?'}</div>
          <span className="font-medium text-slate-900 dark:text-white">{latestCommit.author?.name}</span>
          <span className="text-slate-500 dark:text-slate-400 truncate flex-1">{latestCommit.message}</span>
          <code className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{latestCommit.shortSha}</code>
          <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(latestCommit.author?.date), { addSuffix: true })}</span>
        </div>
      )}

      {/* File content */}
      <div className="card overflow-hidden">
        {/* File header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 text-sm">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-slate-700 dark:text-slate-300">{lines.length} lines</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-700 dark:text-slate-300">{blob.size ? `${(blob.size / 1024).toFixed(1)} KB` : `${blob.content?.length || 0} bytes`}</span>
          </div>
          <div className="flex items-center gap-1">
            {isMarkdown && (
              <button onClick={() => setShowRaw(!showRaw)} className="btn btn-ghost btn-xs">
                {showRaw ? <FileText className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
                {showRaw ? 'Preview' : 'Code'}
              </button>
            )}
            <button onClick={handleCopy} className="btn btn-ghost btn-xs" title="Copy">
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <Link href={`/${owner}/${repo}/commits?ref=${ref}&path=${path}`} className="btn btn-ghost btn-xs" title="History">
              <History className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Content */}
        {isImage ? (
          <div className="p-8 flex items-center justify-center bg-white dark:bg-slate-900">
            <p className="text-sm text-slate-500">Image preview not available for local files</p>
          </div>
        ) : isMarkdown && !showRaw ? (
          <div className="p-6">
            <div className="markdown-body prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}>{blob.content}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto code-scroll">
            <table className="w-full">
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="code-line hover:bg-slate-50 dark:hover:bg-slate-800/50 group" id={`L${i + 1}`}>
                    <td className="code-line-number sticky left-0 bg-white dark:bg-[#0d1117] group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 cursor-pointer select-none"
                      onClick={() => { window.location.hash = `L${i + 1}`; }}>
                      {i + 1}
                    </td>
                    <td className="pl-4 pr-4 py-0 whitespace-pre font-mono text-sm text-slate-800 dark:text-slate-200">{line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
