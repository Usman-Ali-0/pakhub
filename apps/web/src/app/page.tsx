'use client';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import {
  Shield, GitBranch, Lock, Zap, Users, Eye, Code2,
  ArrowRight, Star, CheckCircle2, ChevronRight, Globe, Sparkles,
  GitPullRequest, MessageSquare, Brain, Rocket,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const features = [
  { icon: Code2, label: 'Full Git Hosting', color: 'emerald', desc: 'Clone, push, pull over HTTP. Branch management, tags, and release workflows — exactly like GitHub.' },
  { icon: GitBranch, label: 'Pull Requests', color: 'emerald', desc: 'Create PRs, review code inline, approve or request changes, merge with squash or rebase options.' },
  { icon: Sparkles, label: 'AI Copilot (BYOAI)', color: 'amber', desc: 'Plug in your own API key — OpenAI, Claude, Gemini, Groq, Mistral — and get AI-powered code review and assistance.' },
  { icon: Shield, label: 'Issues & Tracking', color: 'blue', desc: 'Full issue tracker with labels, milestones, assignees, and markdown comments. Never lose track of bugs.' },
  { icon: Users, label: 'Organizations', color: 'violet', desc: 'Create orgs, manage teams, and control repo access with fine-grained permissions.' },
  { icon: Eye, label: 'Activity & Insights', color: 'sky', desc: 'Contribution graphs, commit history, language analytics, and real-time notifications.' },
];

const colorMap: Record<string, { bg: string; icon: string }> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',   icon: 'text-amber-600 dark:text-amber-400' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',      icon: 'text-blue-600 dark:text-blue-400' },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-900/20',  icon: 'text-violet-600 dark:text-violet-400' },
  sky:     { bg: 'bg-sky-50 dark:bg-sky-900/20',        icon: 'text-sky-600 dark:text-sky-400' },
};

const stats = [
  { value: '∞', label: 'Repositories' },
  { value: 'BYOAI', label: 'Any AI Model' },
  { value: '100%', label: 'Open Source' },
  { value: '🇵🇰', label: 'Made in Pakistan' },
];

export default function LandingPage() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117]">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-30"
            style={{ background: 'radial-gradient(ellipse at center, rgba(5,150,105,0.15) 0%, transparent 70%)' }} />
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20"
            style={{ background: 'radial-gradient(ellipse, rgba(52,211,153,0.2) 0%, transparent 70%)' }} />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold tracking-wide mb-8">
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Code Platform — Bring Your Own AI
            <span className="pulse-dot" />
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white mb-6 leading-[1.08] tracking-tight">
            Where Pakistan<br />
            <span className="gradient-text">Builds Software</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            PakHub is a complete GitHub alternative with full Git hosting, pull requests, issues,
            and AI integration — plug in <em>any</em> AI model with your own API key.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            {user ? (
              <Link href="/dashboard" className="btn btn-primary btn-lg gap-2">
                Go to dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link href="/register" id="hero-cta-register" className="btn btn-primary btn-lg gap-2">
                  Get started free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/explore" id="hero-cta-explore" className="btn btn-secondary btn-lg gap-2">
                  <Globe className="w-4 h-4" /> Explore repositories
                </Link>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            {['No credit card required', 'Free forever', 'Any AI model'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{s.value}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
              Everything you need to build great software
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
              A complete development platform — from repository management to AI-powered code review.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, label, color, desc }) => {
              const c = colorMap[color];
              return (
                <div key={label} className="card p-6 hover:border-slate-300 dark:hover:border-slate-600 transition-all group">
                  <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${c.icon}`} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{label}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="py-16 px-4 bg-slate-50 dark:bg-slate-800/30 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-semibold mb-6">
            <Brain className="w-3.5 h-3.5" /> BYOAI — Bring Your Own AI
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            Use any AI model you want
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            PakHub lets you plug in your own API key from any provider. Get AI-powered code review,
            commit message generation, code explanation, and an AI chat assistant — all with the model of your choice.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {['OpenAI (GPT-4)', 'Anthropic (Claude)', 'Google (Gemini)', 'Groq (Llama)', 'Mistral', 'Cohere', 'Ollama (Local)', 'Custom API'].map(name => (
              <div key={name} className="card p-3 text-center">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-pak-green relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(52,211,153,0.25) 0%, transparent 60%)' }} />
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
            Ready to start building?
          </h2>
          <p className="text-emerald-200 mb-8 text-lg">
            Join the growing community of developers on PakHub.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register" className="btn btn-lg bg-white text-pak-green font-semibold hover:bg-slate-100 gap-2 border-0">
              <Rocket className="w-4 h-4" /> Create your account
            </Link>
            <Link href="/login" className="btn btn-lg border-emerald-400/50 text-white hover:bg-white/10 bg-transparent">
              Sign in to your account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#0d1117] border-t border-slate-200 dark:border-slate-800 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-sm">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">
              Pak<span className="text-emerald-600 dark:text-emerald-400">Hub</span>
            </span>
          </div>
          <p className="text-sm text-slate-400">© 2025 PakHub. Built with 💚 in Pakistan.</p>
          <div className="flex items-center gap-5 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/about" className="hover:text-slate-800 dark:hover:text-white transition-colors">About</Link>
            <Link href="/docs" className="hover:text-slate-800 dark:hover:text-white transition-colors">Docs</Link>
            <Link href="/privacy" className="hover:text-slate-800 dark:hover:text-white transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
