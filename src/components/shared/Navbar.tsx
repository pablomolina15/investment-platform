'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BarChart2, BookOpen, Activity, Brain, GitCompare, Briefcase, Newspaper } from 'lucide-react';
import { clsx } from 'clsx';
import UserMenu from '@/components/auth/UserMenu';
import AuthModal from '@/components/auth/AuthModal';

const LINKS = [
  { href: '/',            label: 'Dashboard',   icon: Activity,   ac: 'bg-accent-cyan/10 text-accent-cyan',     hc: 'hover:text-accent-cyan' },
  { href: '/technical',   label: 'Técnico',     icon: BarChart2,  ac: 'bg-accent-cyan/10 text-accent-cyan',     hc: 'hover:text-accent-cyan' },
  { href: '/fundamental', label: 'Fundamental', icon: BookOpen,   ac: 'bg-accent-green/10 text-accent-green',   hc: 'hover:text-accent-green' },
  { href: '/ml',          label: 'IA Predict',  icon: Brain,      ac: 'bg-accent-purple/10 text-accent-purple', hc: 'hover:text-accent-purple' },
  { href: '/compare',     label: 'Comparar',    icon: GitCompare, ac: 'bg-accent-cyan/10 text-accent-cyan',     hc: 'hover:text-accent-cyan' },
  { href: '/news',        label: 'Noticias',    icon: Newspaper,  ac: 'bg-accent-cyan/10 text-accent-cyan',     hc: 'hover:text-accent-cyan' },
  { href: '/watchlist',   label: 'Portfolio',   icon: Briefcase,  ac: 'bg-accent-yellow/10 text-accent-yellow', hc: 'hover:text-accent-yellow' },
];

// Bottom 5 for mobile tab bar
const MOBILE_LINKS = [
  LINKS[0], LINKS[1], LINKS[2], LINKS[3], LINKS[6],
];

export default function Navbar() {
  const pathname = usePathname();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      {/* ── Desktop top navbar ─────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-bg-primary/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              Stock<span className="text-accent-cyan">Lens</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto scrollbar-none flex-1 justify-center">
            {LINKS.map(({ href, label, icon: Icon, ac, hc }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href));
              return (
                <Link key={href} href={href}
                  className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-sans transition-all duration-150 whitespace-nowrap',
                    active ? ac : `text-text-secondary ${hc}`)}>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden xl:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-muted font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow" />
              LIVE
            </div>
            <UserMenu onOpenAuth={() => setShowAuth(true)} />
          </div>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ──────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-primary/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around px-2 py-2 pb-safe">
          {MOBILE_LINKS.map(({ href, label, icon: Icon, ac }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className={clsx(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-150 min-w-0',
                  active ? ac : 'text-text-muted'
                )}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-[10px] font-mono truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
