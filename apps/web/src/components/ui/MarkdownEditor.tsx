'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
  Bold, Italic, Heading, Code, Link as LinkIcon,
  List, ListOrdered, Quote, Table, Image, Eye, Edit3
} from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function MarkdownEditor({ value, onChange, placeholder = 'Leave a comment...', minHeight = '200px' }: MarkdownEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');

  const insertMarkdown = (before: string, after = '', placeholder2 = '') => {
    const textarea = document.getElementById('md-editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || placeholder2;
    const newValue = value.substring(0, start) + before + selected + after + value.substring(end);
    onChange(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    }, 10);
  };

  const tools = [
    { icon: Bold, action: () => insertMarkdown('**', '**', 'bold text'), title: 'Bold' },
    { icon: Italic, action: () => insertMarkdown('_', '_', 'italic text'), title: 'Italic' },
    { icon: Heading, action: () => insertMarkdown('### ', '', 'Heading'), title: 'Heading' },
    { sep: true },
    { icon: Code, action: () => insertMarkdown('`', '`', 'code'), title: 'Inline code' },
    { icon: LinkIcon, action: () => insertMarkdown('[', '](url)', 'link text'), title: 'Link' },
    { icon: Image, action: () => insertMarkdown('![alt](', ')', 'image-url'), title: 'Image' },
    { sep: true },
    { icon: List, action: () => insertMarkdown('- ', '', 'list item'), title: 'Bullet list' },
    { icon: ListOrdered, action: () => insertMarkdown('1. ', '', 'list item'), title: 'Numbered list' },
    { icon: Quote, action: () => insertMarkdown('> ', '', 'quote'), title: 'Quote' },
    { icon: Table, action: () => insertMarkdown('| Column | Column |\n| --- | --- |\n| ', ' | |\n', 'cell'), title: 'Table' },
  ];

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
      {/* Tabs + Toolbar */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-2 py-1">
        <button
          id="md-tab-write"
          onClick={() => setMode('write')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            mode === 'write'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5 inline mr-1.5" />Write
        </button>
        <button
          id="md-tab-preview"
          onClick={() => setMode('preview')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            mode === 'preview'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5 inline mr-1.5" />Preview
        </button>

        {mode === 'write' && (
          <div className="flex items-center gap-0.5 ml-auto">
            {tools.map((tool, i) =>
              'sep' in tool ? (
                <div key={i} className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
              ) : (
                <button
                  key={i}
                  onClick={tool.action}
                  title={tool.title}
                  className="p-1.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors"
                >
                  <tool.icon className="w-4 h-4" />
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {mode === 'write' ? (
        <textarea
          id="md-editor-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 text-sm font-mono resize-y bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
          style={{ minHeight }}
        />
      ) : (
        <div className="px-4 py-3 min-h-[200px]" style={{ minHeight }}>
          {value ? (
            <div className="markdown-body prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {value}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">Nothing to preview</p>
          )}
        </div>
      )}

      <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-2 bg-slate-50 dark:bg-slate-900/50">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Markdown is supported. Drag and drop files to upload.
        </p>
      </div>
    </div>
  );
}
