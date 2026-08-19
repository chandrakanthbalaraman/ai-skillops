import Link from 'next/link';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/repositories', label: 'Repositories' },
  { href: '/artifacts', label: 'Artifacts' },
  { href: '/review', label: 'Review' },
  { href: '/analytics', label: 'Analytics' },
];

export function Nav() {
  return (
    <nav className="border-b border-gray-800 bg-gray-900 px-6 py-3 flex gap-6 items-center">
      <span className="font-bold text-indigo-400 mr-4">ai-skillops</span>
      {links.map(l => (
        <Link key={l.href} href={l.href} className="text-sm text-gray-300 hover:text-white">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
