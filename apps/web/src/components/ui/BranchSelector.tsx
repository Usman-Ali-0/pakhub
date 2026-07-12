'use client';
import { useState, useRef, useEffect } from 'react';
import { GitBranch, Tag, Search, Check, ChevronDown } from 'lucide-react';

interface BranchSelectorProps {
  branches: string[];
  tags?: string[];
  currentRef: string;
  onChange: (ref: string) => void;
  defaultBranch?: string;
}

export function BranchSelector({ branches, tags = [], currentRef, onChange, defaultBranch = 'main' }: BranchSelectorProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'branches' | 'tags'>('branches');
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayRef = currentRef === 'HEAD' ? (defaultBranch || branches[0] || 'main') : currentRef;
  const items = tab === 'branches' ? branches : tags;
  const filtered = items.filter(b => b.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <button
        id="branch-selector"
        onClick={() => setOpen(!open)}
        className="btn btn-secondary btn-sm gap-2"
      >
        <GitBranch className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span className="font-medium max-w-[150px] truncate">{displayRef}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="dropdown-menu left-0 top-full mt-1 w-72 animate-slide-down">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-900 dark:text-white mb-2">Switch branches/tags</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter..."
                className="input pl-8 text-xs py-1.5"
                autoFocus
              />
            </div>
          </div>

          <div className="flex border-b border-slate-100 dark:border-slate-700">
            <button
              onClick={() => setTab('branches')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                tab === 'branches'
                  ? 'text-slate-900 dark:text-white border-b-2 border-emerald-600 dark:border-emerald-500'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 inline mr-1" /> Branches
            </button>
            <button
              onClick={() => setTab('tags')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                tab === 'tags'
                  ? 'text-slate-900 dark:text-white border-b-2 border-emerald-600 dark:border-emerald-500'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Tag className="w-3.5 h-3.5 inline mr-1" /> Tags
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length > 0 ? filtered.map(item => (
              <button
                key={item}
                onClick={() => { onChange(item); setOpen(false); setSearch(''); }}
                className="dropdown-item text-xs group"
              >
                {item === displayRef ? (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <span className="w-4" />
                )}
                <span className="flex-1 truncate font-mono">{item}</span>
                {item === defaultBranch && (
                  <span className="badge badge-neutral text-[10px] px-1.5 py-0">default</span>
                )}
              </button>
            )) : (
              <p className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 text-center">
                No {tab} found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
