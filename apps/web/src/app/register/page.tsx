'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, Code2, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordChecks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Contains a number', ok: /\d/.test(password) },
    { label: 'Contains a letter', ok: /[a-zA-Z]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) { toast.error('Fill in all fields'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const res = await authApi.register({ username: username.trim(), email: email.trim(), password });
      setAuth(res.user, res.accessToken, res.refreshToken);
      toast.success('Account created! Welcome to PakHub 🇵🇰');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0d1117] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg">
              <Code2 className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Join PakHub</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create your account — it&apos;s free</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Username</label>
            <input id="register-username" type="text" value={username} onChange={e => setUsername(e.target.value)} className="input" placeholder="johndoe" autoFocus autoComplete="username" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email address</label>
            <input id="register-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="you@example.com" autoComplete="email" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <input id="register-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input pr-10" placeholder="At least 8 characters" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <div className="mt-2 space-y-1">
                {passwordChecks.map(c => (
                  <div key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${c.ok ? 'text-emerald-500' : 'text-slate-300'}`} /> {c.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button id="register-submit" type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Create account
          </button>
          <p className="text-xs text-slate-400 text-center">
            By creating an account, you agree to the <Link href="/terms" className="text-link">Terms of Service</Link>.
          </p>
        </form>

        <div className="card p-4 mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-link font-medium">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
