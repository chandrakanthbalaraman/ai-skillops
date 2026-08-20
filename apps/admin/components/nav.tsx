'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/repositories', label: 'Repositories' },
  { href: '/artifacts', label: 'Artifacts' },
  { href: '/review', label: 'Review' },
  { href: '/analytics', label: 'Analytics' },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 flex items-center h-16 gap-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/25 transition-shadow">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <span className="font-semibold text-sm bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            ai-skillops
          </span>
        </Link>

        <div className="w-px h-5 bg-border/60" />

        {/* Nav links */}
        <nav className="flex gap-0.5">
          {links.map(l => {
            const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'relative px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
                  active
                    ? 'text-foreground bg-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
                )}
              >
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-px bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                )}
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto">
          <span className="text-xs text-muted-foreground/60 font-mono">v1</span>
        </div>
      </div>
    </header>
  );
}
