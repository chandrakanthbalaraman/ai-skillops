import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

async function getStats() {
  const supabase = createSupabaseServerClient();
  const [repos, artifacts, pending, blocked] = await Promise.all([
    supabase.from('repositories').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('artifacts').select('id', { count: 'exact', head: true }),
    supabase.from('artifacts').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('artifacts').select('id', { count: 'exact', head: true }).eq('status', 'blocked'),
  ]);
  return {
    repos: repos.count ?? 0,
    artifacts: artifacts.count ?? 0,
    pending: pending.count ?? 0,
    blocked: blocked.count ?? 0,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    { label: 'Active Repositories', value: stats.repos, desc: 'Scanned and active' },
    { label: 'Total Artifacts', value: stats.artifacts, desc: 'Skills, rules, contexts' },
    { label: 'Pending Review', value: stats.pending, desc: 'Awaiting moderation', highlight: stats.pending > 0 },
    { label: 'Blocked', value: stats.blocked, desc: 'Flagged by safety scan', danger: stats.blocked > 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Registry health overview</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map(c => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${c.danger ? 'text-destructive' : c.highlight ? 'text-yellow-400' : ''}`}>
                {c.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Status</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-green-400 border-green-400/30">
            {stats.repos} repos active
          </Badge>
          <Badge variant="outline" className="text-indigo-400 border-indigo-400/30">
            {stats.artifacts} total artifacts
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
    </div>
  );
}
