import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

async function getStats() {
  const supabase = createSupabaseAdminClient();
  const [repos, active, artifacts, pending, blocked] = await Promise.all([
    supabase.from('repositories').select('id', { count: 'exact', head: true }),
    supabase.from('repositories').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('artifacts').select('id', { count: 'exact', head: true }),
    supabase.from('artifacts').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('artifacts').select('id', { count: 'exact', head: true }).eq('status', 'blocked'),
  ]);
  return {
    totalRepos: repos.count ?? 0,
    activeRepos: active.count ?? 0,
    artifacts: artifacts.count ?? 0,
    pending: pending.count ?? 0,
    blocked: blocked.count ?? 0,
  };
}

const statCards = (s: Awaited<ReturnType<typeof getStats>>) => [
  {
    label: 'Total Repositories',
    value: s.totalRepos,
    sub: `${s.activeRepos} active`,
    gradient: 'from-indigo-500/20 to-indigo-600/5',
    icon: (
      <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
  },
  {
    label: 'Total Artifacts',
    value: s.artifacts,
    sub: 'skills, rules, contexts',
    gradient: 'from-purple-500/20 to-purple-600/5',
    icon: (
      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
  {
    label: 'Pending Review',
    value: s.pending,
    sub: 'awaiting moderation',
    gradient: s.pending > 0 ? 'from-yellow-500/20 to-yellow-600/5' : 'from-muted/20 to-muted/5',
    accent: s.pending > 0 ? 'text-yellow-400' : '',
    icon: (
      <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Blocked',
    value: s.blocked,
    sub: 'flagged by safety scan',
    gradient: s.blocked > 0 ? 'from-red-500/20 to-red-600/5' : 'from-muted/20 to-muted/5',
    accent: s.blocked > 0 ? 'text-red-400' : '',
    icon: (
      <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
];

export default async function DashboardPage() {
  const stats = await getStats();
  const cards = statCards(stats);

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <div className="relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 rounded-2xl" />
        <div className="py-6 px-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Registry Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Monitor and manage AI artifact health across all repositories</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map(c => (
          <Card key={c.label} className={`relative overflow-hidden border-border/50 bg-gradient-to-br ${c.gradient}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{c.label}</p>
                <div className="p-1.5 rounded-lg bg-background/40">{c.icon}</div>
              </div>
              <div className={`text-4xl font-bold tabular-nums ${c.accent ?? 'text-foreground'}`}>{c.value}</div>
              <p className="text-xs text-muted-foreground mt-1.5">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status strip */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mr-1">Status</span>
        <Badge variant="outline" className="text-green-400 border-green-400/30 gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          {stats.activeRepos} repos active
        </Badge>
        <Badge variant="outline" className="text-indigo-400 border-indigo-400/30">
          {stats.artifacts} artifacts indexed
        </Badge>
        {stats.pending > 0 && (
          <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
            {stats.pending} pending review
          </Badge>
        )}
        {stats.blocked > 0 && (
          <Badge variant="destructive">{stats.blocked} blocked</Badge>
        )}
      </div>
    </div>
  );
}
