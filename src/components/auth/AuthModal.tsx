'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { X, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
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
