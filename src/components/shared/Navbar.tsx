'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BarChart2, BookOpen, Activity, Brain, GitCompare, Star, Newspaper } from 'lucide-react';
import { clsx } from 'clsx';
import UserMenu from '@/components/auth/UserMenu';
import AuthModal from '@/components/auth/AuthModal';

export default function Navbar() {
  const pathname = usePathname();
  const [showAuth, setShowAuth] = useState(false);

  const links = [
    { href: '/',            label: 'Dashboard',   icon: Activity,   ac: 'bg-accent-cyan/10 text-accent-cyan',    hc: 'hover:text-accent-cyan' },
    { href: '/technical',   label: 'Técnico',     icon: BarChart2,  ac: 'bg-accent-cyan/10 text-accent-cyan',    hc: 'hover:text-accent-cyan' },
    { href: '/fundamental', label: 'Fundamental', icon: BookOpen,   ac: 'bg-accent-green/10 text-accent-green',  hc: 'hover:text-accent-green' },
    { href: '/ml',          label: 'IA Predict',  icon: Brain,      ac: 'bg-accent-purple/10 text-accent-purple',hc: 'hover:text-accent-purple' },
    { href: '/compare',     label: 'Comparar',    icon: GitCompare, ac: 'bg-accent-yellow/10 text-accent-yellow',hc: 'hover:text-accent-yellow' },
    { href: '/news',        label: 'Noticias',    icon: Newspaper,  ac: 'bg-accent-cyan/10 text-accent-cyan',    hc: 'hover:text-accent-cyan' },
    { href: '/watchlist',   label: 'Watchlist',   icon: Star,       ac: 'bg-accent-yellow/10 text-accent-yellow',hc: 'hover:text-accent-yellow' },
  ];

  return (
    <>
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

          <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-none flex-1 justify-center">
            {links.map(({ href, label, icon: Icon, ac, hc }) => {
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
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
