'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { X, Github, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
}

export default function AuthModal({ onClose, defaultTab = 'login' }: Props) {
  const { signInWithGithub, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [tab, setTab]           = useState<'login' | 'signup'>(defaultTab);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  async function handleOAuth(provider: 'github' | 'google') {
    setLoading(provider); setError(null);
    try {
      if (provider === 'github') await signInWithGithub();
      else await signInWithGoogle();
    } catch { setError('Error al conectar con el proveedor'); }
    finally { setLoading(null); }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('Rellena todos los campos'); return; }
    setLoading('email'); setError(null); setSuccess(null);
    const err = tab === 'login'
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password);
    setLoading(null);
    if (err) { setError(err); return; }
    if (tab === 'signup') {
      setSuccess('¡Cuenta creada! Revisa tu email para confirmarla.');
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-bg-primary/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-card animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display font-bold text-xl text-text-primary">
              {tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </h2>
            <p className="text-xs text-text-muted font-mono mt-0.5">Watchlist sincronizada en todos tus dispositivos</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-bg-elevated rounded-lg p-1 mb-5">
          {(['login', 'signup'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(null); setSuccess(null); }}
              className={clsx('flex-1 py-1.5 rounded-md text-xs font-mono transition-all',
                tab === t ? 'bg-bg-card text-text-primary shadow-sm border border-border' : 'text-text-muted hover:text-text-secondary')}>
              {t === 'login' ? 'Entrar' : 'Registrarse'}
            </button>
          ))}
        </div>

        {/* OAuth */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={() => handleOAuth('github')} disabled={!!loading}
            className="flex items-center justify-center gap-2 py-2.5 bg-bg-elevated border border-border rounded-lg text-sm font-mono text-text-secondary hover:text-text-primary hover:border-border-bright transition-all disabled:opacity-40">
            {loading === 'github' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
            GitHub
          </button>
          <button onClick={() => handleOAuth('google')} disabled={!!loading}
            className="flex items-center justify-center gap-2 py-2.5 bg-bg-elevated border border-border rounded-lg text-sm font-mono text-text-secondary hover:text-text-primary hover:border-border-bright transition-all disabled:opacity-40">
            {loading === 'google' ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            )}
            Google
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs font-mono text-text-muted">o con email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@ejemplo.com"
              className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña"
              className="w-full pl-10 pr-10 py-2.5 bg-bg-elevated border border-border rounded-lg text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors" />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-accent-red/10 border border-accent-red/25 text-accent-red rounded-lg px-3 py-2 text-xs font-mono">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-accent-green/10 border border-accent-green/25 text-accent-green rounded-lg px-3 py-2 text-xs font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> {success}
            </div>
          )}

          <button type="submit" disabled={!!loading}
            className="w-full py-2.5 bg-accent-cyan text-bg-primary font-mono font-bold rounded-lg text-sm hover:bg-accent-cyan/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
            {loading === 'email' && <Loader2 className="w-4 h-4 animate-spin" />}
            {tab === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-xs text-text-muted font-mono mt-4">
          {tab === 'login' ? '¿Sin cuenta? ' : '¿Ya tienes cuenta? '}
          <button onClick={() => { setTab(tab === 'login' ? 'signup' : 'login'); setError(null); }}
            className="text-accent-cyan hover:underline">
            {tab === 'login' ? 'Regístrate' : 'Entra'}
          </button>
        </p>
      </div>
    </div>
  );
}
