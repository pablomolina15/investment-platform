'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(() => {
      router.replace('/watchlist');
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-2 border-accent-cyan border-t-transparent animate-spin mx-auto mb-4" />
        <p className="font-mono text-text-secondary text-sm">Completando inicio de sesión…</p>
      </div>
    </div>
  );
}
