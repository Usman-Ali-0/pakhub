'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Brain, Plus, Trash2, Loader2, Key, Shield, Sparkles, Eye, EyeOff, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { aiApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

const AI_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'], color: '#10a37f', desc: 'GPT-4o, GPT-4 Turbo, and more' },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-sonnet-4-20250514', 'claude-3-haiku-20240307'], color: '#d97706', desc: 'Claude Sonnet, Haiku' },
  { id: 'google', name: 'Google AI', models: ['gemini-2.5-pro', 'gemini-2.5-flash'], color: '#4285f4', desc: 'Gemini Pro, Gemini Flash' },
  { id: 'groq', name: 'Groq', models: ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768'], color: '#f97316', desc: 'Llama 3.1, Mixtral — blazing fast' },
  { id: 'mistral', name: 'Mistral AI', models: ['mistral-large-latest', 'mistral-medium-latest'], color: '#ff7000', desc: 'Mistral Large, Medium' },
  { id: 'cohere', name: 'Cohere', models: ['command-r-plus', 'command-r'], color: '#39594d', desc: 'Command R+, Command R' },
  { id: 'ollama', name: 'Ollama (Local)', models: ['codellama', 'llama3', 'mistral'], color: '#ffffff', desc: 'Run models locally' },
  { id: 'custom', name: 'Custom API', models: ['custom'], color: '#6366f1', desc: 'Any OpenAI-compatible API' },
];

export default function AISettingsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [adding, setAdding] = useState(false);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: () => aiApi.getProviders(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiApi.deleteProvider(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-providers'] }); toast.success('Provider removed'); },
    onError: () => toast.error('Failed to delete'),
  });

  const handleAdd = async () => {
    if (!selectedProvider || !apiKey.trim()) { toast.error('Provider and API key required'); return; }
    setAdding(true);
    try {
      const providerEnum = selectedProvider === 'google' ? 'GEMINI' : selectedProvider.toUpperCase();
      await aiApi.addProvider({ 
        provider: providerEnum, 
        apiKey: apiKey.trim(), 
        selectedModel: selectedModel, 
        endpoint: baseUrl.trim() || undefined 
      });
      toast.success('AI provider added!');
      setShowAddForm(false);
      setSelectedProvider('');
      setApiKey('');
      setSelectedModel('');
      setBaseUrl('');
      qc.invalidateQueries({ queryKey: ['ai-providers'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add provider');
    } finally { setAdding(false); }
  };

  const providerInfo = AI_PROVIDERS.find(p => p.id === selectedProvider);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-20 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Providers</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Bring Your Own AI — connect any AI model with your API key</p>
          </div>
        </div>

        {/* Info banner */}
        <div className="card p-4 mb-8 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-300">Your API keys are encrypted</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Keys are encrypted at rest using AES-256. We never log or share your API keys. You can delete them at any time.</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Sparkles, title: 'AI Code Review', desc: 'Get AI-powered feedback on your pull requests' },
            { icon: Brain, title: 'Code Explanation', desc: 'Let AI explain complex code patterns' },
            { icon: Settings, title: 'Commit Messages', desc: 'Auto-generate meaningful commit messages' },
          ].map(f => (
            <div key={f.title} className="card p-4">
              <f.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Connected providers */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Connected Providers</h2>
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Add provider
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : providers.length === 0 ? (
          <div className="card p-8 text-center mb-6">
            <Key className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">No AI providers connected</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Add your first AI provider to unlock AI-powered features.</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {providers.map((p: any) => {
              const info = AI_PROVIDERS.find(a => a.id === p.provider);
              return (
                <div key={p.id} className="card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: (info?.color || '#6366f1') + '15' }}>
                    <Brain className="w-5 h-5" style={{ color: info?.color || '#6366f1' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{info?.name || p.provider}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Model: {p.model || 'default'} · Added {new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-success text-xs"><CheckCircle className="w-3 h-3" /> Active</span>
                    <button onClick={() => deleteMutation.mutate(p.id)} className="btn btn-ghost btn-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add form */}
        {showAddForm && (
          <div className="card p-6 mb-6 animate-slide-down">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Add AI Provider</h3>

            {/* Provider grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {AI_PROVIDERS.map(p => (
                <button key={p.id} onClick={() => { setSelectedProvider(p.id); setSelectedModel(p.models[0]); }}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${selectedProvider === p.id ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>

            {selectedProvider && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">API Key <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input id="ai-api-key" type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)}
                      placeholder={`Enter your ${providerInfo?.name} API key`} className="input pl-10 pr-10 font-mono text-sm" />
                    <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Model</label>
                  <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="input text-sm">
                    {providerInfo?.models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {(selectedProvider === 'ollama' || selectedProvider === 'custom') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Base URL</label>
                    <input type="url" value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
                      placeholder={selectedProvider === 'ollama' ? 'http://localhost:11434' : 'https://your-api.com/v1'}
                      className="input text-sm font-mono" />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => { setShowAddForm(false); setSelectedProvider(''); setApiKey(''); }} className="btn btn-secondary btn-sm">Cancel</button>
                  <button id="save-ai-provider" onClick={handleAdd} disabled={adding || !apiKey.trim()} className="btn btn-primary btn-sm">
                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add provider
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
