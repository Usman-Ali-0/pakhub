'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Folder, FileText, GitBranch, ChevronRight, Loader2, Star, Eye, GitFork, Scale, Download, Users, Copy, CheckCircle } from 'lucide-react';
import { reposApi, gitApi } from '@/lib/api';
import { BranchSelector } from '@/components/ui/BranchSelector';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import toast from 'react-hot-toast';

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Go: '#00ADD8',
  Rust: '#dea584', Java: '#b07219', 'C++': '#f34b7d', HTML: '#e34c26', CSS: '#563d7c',
  Ruby: '#701516', PHP: '#4F5D95', Shell: '#89e051', Dockerfile: '#384d54',
  JSON: '#292929', YAML: '#cb171e', Markdown: '#083fa1', TOML: '#9c4221',
};

export default function RepoCodePage() {
  const { owner, repo } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const ref = searchParams.get('ref') || 'HEAD';
  const path = searchParams.get('path') || '';
  const [showClone, setShowClone] = useState(false);
  const [cloneCopied, setCloneCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: repository } = useQuery({
    queryKey: ['repo', owner, repo],
    queryFn: () => reposApi.getRepo(owner as string, repo as string),
  });

  const { data: tree, isLoading: treeLoading } = useQuery({
    queryKey: ['tree', owner, repo, ref, path],
    queryFn: () => gitApi.getTree(owner as string, repo as string, ref, path),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches', owner, repo],
    queryFn: () => reposApi.getBranches(owner as string, repo as string),
  });

  const { data: languages } = useQuery({
    queryKey: ['languages', owner, repo],
    queryFn: () => reposApi.getLanguages(owner as string, repo as string),
  });

  const { data: contributors } = useQuery({
    queryKey: ['contributors', owner, repo],
    queryFn: () => reposApi.getContributors(owner as string, repo as string),
  });

  const { data: readme } = useQuery({
    queryKey: ['readme', owner, repo, ref],
    queryFn: async () => {
      try { const blob = await gitApi.getBlob(owner as string, repo as string, ref, 'README.md'); return blob?.content; } catch { return null; }
    },
    enabled: !path,
  });

  const branchNames = branches.map((b: any) => b.name || b);
  const defaultBranch = branches.find((b: any) => b.isDefault)?.name || branches[0]?.name || 'main';
  const entries = Array.isArray(tree) ? tree : (tree?.entries || []);
  const sortedEntries = [...entries].sort((a: any, b: any) => {
    if (a.type === 'tree' && b.type !== 'tree') return -1;
    if (a.type !== 'tree' && b.type === 'tree') return 1;
    return (a.name || a.path || '').localeCompare(b.name || b.path || '');
  });

  const pathParts = path.split('/').filter(Boolean);

  // Language bar
  const langEntries = languages ? Object.entries(languages) : [];
  const langTotal = langEntries.reduce((s, [, v]) => s + (v as number), 0);

  const cloneUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/git/${owner}/${repo}.git`;

  const handleCopyClone = () => {
    navigator.clipboard.writeText(cloneUrl);
    setCloneCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCloneCopied(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Branch selector + actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BranchSelector branches={branchNames} currentRef={ref} onChange={(b) => router.push(`/${owner}/${repo}?ref=${b}&path=${path}`)} defaultBranch={defaultBranch} />
            {pathParts.length > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Link href={`/${owner}/${repo}?ref=${ref}`} className="text-link font-semibold">{repo as string}</Link>
                {pathParts.map((part, i) => {
                  const partPath = pathParts.slice(0, i + 1).join('/');
                  const isLast = i === pathParts.length - 1;
                  return (
                    <span key={i} className="flex items-center gap-1">
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      {isLast ? <span className="font-semibold text-slate-900 dark:text-white">{part}</span> : (
                        <Link href={`/${owner}/${repo}?ref=${ref}&path=${partPath}`} className="text-link">{part}</Link>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 relative">
            {sortedEntries.length > 0 && (
              <div className="relative group">
                <button className="btn btn-secondary btn-sm hidden sm:flex">Add file <ChevronRight className="w-3.5 h-3.5 rotate-90" /></button>
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 py-1">
                  <label className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".zip" 
                      disabled={isUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploading(true);
                        const loadingToast = toast.loading('Uploading and extracting files...');
                        try {
                          await reposApi.uploadFile(owner as string, repo as string, file, ref === 'HEAD' ? defaultBranch : ref, 'Upload files via web');
                          toast.success('Files uploaded successfully!', { id: loadingToast });
                          window.location.reload();
                        } catch (err: any) {
                          toast.error(err.response?.data?.error || 'Failed to upload files', { id: loadingToast });
                          setIsUploading(false);
                        }
                      }} 
                    />
                    {isUploading ? <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</span> : 'Upload files (.zip)'}
                  </label>
                </div>
              </div>
            )}
            
            <button onClick={() => setShowClone(!showClone)} className="btn btn-primary btn-sm">
              <Download className="w-4 h-4" /> Code
            </button>
            {showClone && (
              <div className="absolute right-0 top-full mt-1 w-80 animate-slide-down p-4 bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-10">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Clone</h4>
                <div className="flex items-center gap-2">
                  <input value={cloneUrl} readOnly className="input text-xs font-mono flex-1 bg-slate-50 dark:bg-slate-900" />
                  <button onClick={handleCopyClone} className="btn btn-secondary btn-xs">
                    {cloneCopied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">Use Git to clone this repository.</p>
              </div>
            )}
          </div>
        </div>

        {/* File tree */}
        <div className="card overflow-hidden mb-6">
          {treeLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : sortedEntries.length === 0 ? (
            <div className="p-8 bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-slate-800 rounded-lg m-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick setup — if you've done this kind of thing before</h3>
              <div className="flex items-center gap-2 mb-6">
                <input value={cloneUrl} readOnly className="input font-mono flex-1 text-sm bg-white dark:bg-slate-900" />
                <button onClick={handleCopyClone} className="btn btn-secondary">
                  {cloneCopied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <h4 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm">…or upload an existing project</h4>
              <div className="bg-slate-100 dark:bg-[#161b22] rounded-md p-4 mb-6 text-center border border-dashed border-slate-300 dark:border-slate-700">
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center py-4 text-emerald-600 dark:text-emerald-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-3" />
                    <p className="font-medium text-sm">Uploading and extracting project...</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Please wait, this may take a moment.</p>
                  </div>
                ) : (
                  <>
                    <label className="btn btn-primary cursor-pointer inline-flex">
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".zip" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploading(true);
                          const loadingToast = toast.loading('Uploading and extracting project...');
                          try {
                            await reposApi.uploadFile(owner as string, repo as string, file, defaultBranch, 'Initial commit from zip');
                            toast.success('Project uploaded successfully!', { id: loadingToast });
                            window.location.reload();
                          } catch (err: any) {
                            toast.error(err.response?.data?.error || 'Failed to upload project', { id: loadingToast });
                            setIsUploading(false);
                          }
                        }} 
                      />
                      Upload project .zip file
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Upload a ZIP file containing your project. We'll automatically extract and commit it to the default branch.</p>
                  </>
                )}
              </div>

              <h4 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm">…or create a new repository on the command line</h4>
              <div className="bg-slate-100 dark:bg-[#161b22] rounded-md p-4 mb-6 border border-slate-200 dark:border-slate-800">
                <pre className="text-slate-800 dark:text-slate-300 font-mono text-xs whitespace-pre-wrap">
echo "# {repo}" &gt;&gt; README.md{'\n'}
git init{'\n'}
git add README.md{'\n'}
git commit -m "first commit"{'\n'}
git branch -M main{'\n'}
git remote add origin {cloneUrl}{'\n'}
git push -u origin main
                </pre>
              </div>

              <h4 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm">…or push an existing repository from the command line</h4>
              <div className="bg-slate-100 dark:bg-[#161b22] rounded-md p-4 border border-slate-200 dark:border-slate-800">
                <pre className="text-slate-800 dark:text-slate-300 font-mono text-xs whitespace-pre-wrap">
git remote add origin {cloneUrl}{'\n'}
git branch -M main{'\n'}
git push -u origin main
                </pre>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <tbody>
                {sortedEntries.map((entry: any) => {
                  const name = entry.name || entry.path?.split('/').pop() || '';
                  const isDir = entry.type === 'tree' || entry.type === 'dir';
                  const entryPath = path ? `${path}/${name}` : name;
                  const href = isDir
                    ? `/${owner}/${repo}?ref=${ref}&path=${entryPath}`
                    : `/${owner}/${repo}/blob?ref=${ref}&path=${entryPath}`;

                  return (
                    <tr key={name} className="file-entry group">
                      <td className="w-8">
                        {isDir ? <Folder className="w-5 h-5 text-blue-400" /> : <FileText className="w-5 h-5 text-slate-400" />}
                      </td>
                      <td className="flex-1">
                        <Link href={href} className="text-sm text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline">
                          {name}
                        </Link>
                      </td>
                      <td className="text-right text-xs text-slate-400 hidden sm:table-cell">
                        {entry.lastCommit?.message && (
                          <span className="truncate max-w-[300px] inline-block">{entry.lastCommit.message}</span>
                        )}
                      </td>
                      <td className="text-right text-xs text-slate-400 hidden md:table-cell w-32">
                        {entry.lastCommit?.date && formatDistanceToNow(new Date(entry.lastCommit.date), { addSuffix: true })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* README */}
        {readme && !path && (
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">README.md</span>
            </div>
            <div className="p-6">
              <div className="markdown-body prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}>{readme}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - About */}
      {!path && (
        <div className="w-full lg:w-72 flex-shrink-0 space-y-6">
          {/* About */}
          <div className="sidebar-section">
            <h3 className="sidebar-title">About</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {repository?.description || 'No description provided.'}
            </p>
            {repository?.website && (
              <a href={repository.website} className="text-sm text-link flex items-center gap-1 mt-2" target="_blank">
                <LinkIcon className="w-3.5 h-3.5" /> {repository.website}
              </a>
            )}
            {repository?.topics?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {repository.topics.map((t: string) => (
                  <span key={t} className="badge badge-info text-xs">{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="sidebar-section">
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2"><Star className="w-4 h-4" /> <strong className="text-slate-900 dark:text-white">{repository?.starsCount || 0}</strong> stars</div>
              <div className="flex items-center gap-2"><Eye className="w-4 h-4" /> <strong className="text-slate-900 dark:text-white">{repository?.watchersCount || 0}</strong> watching</div>
              <div className="flex items-center gap-2"><GitFork className="w-4 h-4" /> <strong className="text-slate-900 dark:text-white">{repository?.forksCount || 0}</strong> forks</div>
            </div>
          </div>

          {/* Languages */}
          {langEntries.length > 0 && (
            <div className="sidebar-section">
              <h3 className="sidebar-title">Languages</h3>
              <div className="w-full h-2 rounded-full overflow-hidden flex mb-3">
                {langEntries.map(([lang, bytes]) => (
                  <div key={lang} className="h-full" style={{ width: `${((bytes as number) / langTotal) * 100}%`, backgroundColor: LANG_COLORS[lang] || '#94a3b8' }}
                    title={`${lang}: ${(((bytes as number) / langTotal) * 100).toFixed(1)}%`} />
                ))}
              </div>
              <div className="space-y-1">
                {langEntries.map(([lang, bytes]) => (
                  <div key={lang} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LANG_COLORS[lang] || '#94a3b8' }} />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{lang}</span>
                    <span className="text-slate-400">{(((bytes as number) / langTotal) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contributors */}
          {contributors?.length > 0 && (
            <div className="sidebar-section">
              <h3 className="sidebar-title">Contributors</h3>
              <div className="flex flex-wrap gap-1.5">
                {contributors.slice(0, 12).map((c: any) => (
                  <Link key={c.username || c.name} href={`/${c.username}`} title={c.username || c.name}
                    className="avatar avatar-sm hover:ring-2 hover:ring-emerald-500 transition-all">
                    {(c.username || c.name || '?')[0].toUpperCase()}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* License */}
          {repository?.license && (
            <div className="sidebar-section">
              <h3 className="sidebar-title">License</h3>
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Scale className="w-4 h-4 text-slate-400" /> {repository.license}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
