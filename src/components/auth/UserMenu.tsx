'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { User, LogOut, Star, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  onOpenAuth: () => void;
}

export default function UserMenu({ onOpenAuth }: Props) {
  const { user, signOut, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (loading) return <div className="w-7 h-7 rounded-full bg-bg-elevated animate-pulse" />;

  if (!user) {
    return (
      <button onClick={onOpenAuth}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-border text-text-muted hover:text-accent-cyan hover:border-accent-cyan/30 rounded-lg transition-all">
        <User className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Entrar</span>
      </button>
    );
  }

  const initials = user.email?.slice(0, 2).toUpperCase() ?? 'U';
  const avatar = user.user_metadata?.avatar_url as string | undefined;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-elevated transition-all border border-transparent hover:border-border">
        {avatar
          ? <img src={avatar} alt="" className="w-6 h-6 rounded-full" />
          : <div className="w-6 h-6 rounded-full bg-accent-cyan/20 border border-accent-cyan/40 flex items-center justify-center text-xs font-mono font-bold text-accent-cyan">{initials}</div>
        }
        <span className="hidden sm:block text-xs font-mono text-text-secondary max-w-[100px] truncate">
          {user.user_metadata?.full_name ?? user.email?.split('@')[0]}
        </span>
        <ChevronDown className={`w-3 h-3 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-bg-card border border-border rounded-xl shadow-card overflow-hidden z-50 animate-fade-in">
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-xs font-mono text-text-secondary truncate">{user.email}</p>
          </div>
          <button onClick={() => { router.push('/watchlist'); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors text-left">
            <Star className="w-3.5 h-3.5 text-accent-yellow" /> Mi Watchlist
          </button>
          <div className="border-t border-border" />
          <button onClick={async () => { await signOut(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-mono text-text-muted hover:text-accent-red hover:bg-accent-red/5 transition-colors text-left">
            <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
