'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

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
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-4">
        <span className="font-bold text-sm text-indigo-500 shrink-0">ai-skillops</span>
        <Separator orientation="vertical" className="h-5" />
        <nav className="flex gap-1">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm transition-colors',
                pathname === l.href
                  ? 'bg-secondary text-secondary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
