'use client';

import { useState, useRef, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Brain, Send, Loader2, Sparkles } from 'lucide-react';
import { aiApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useTranslation } from '@/i18n/I18nProvider';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117]">
        <Navbar />
        <div className="pt-32 text-center">
          <p className="text-slate-500 mb-4">Sign in to use PakHub AI Chat.</p>
          <Link href="/login" className="btn btn-primary">{t.auth.login}</Link>
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const reply = await aiApi.chat(newMessages);
      setMessages([...newMessages, { role: 'assistant', content: reply.reply || reply }]);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I could not process your request. Please configure an AI provider in Settings → AI.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117] flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 pt-20 pb-4 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t.ai.chat}</h1>
            <p className="text-xs text-slate-500">Powered by your configured AI provider (GPT, Claude, Gemini, Groq, etc.)</p>
          </div>
          <Link href="/settings/ai" className="ml-auto btn btn-secondary btn-sm">
            <Sparkles className="w-4 h-4" /> Configure AI
          </Link>
        </div>

        <div className="flex-1 card overflow-hidden flex flex-col min-h-[60vh]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{t.ai.placeholder}</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> {t.ai.thinking}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 p-4">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder={t.ai.placeholder}
                className="input flex-1"
                disabled={loading}
              />
              <button onClick={handleSend} disabled={loading || !input.trim()} className="btn btn-primary">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {t.ai.send}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
