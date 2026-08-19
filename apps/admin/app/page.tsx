import { createSupabaseServerClient } from '@/lib/supabase/server';

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
    { label: 'Active Repositories', value: stats.repos },
    { label: 'Total Artifacts', value: stats.artifacts },
    { label: 'Pending Review', value: stats.pending },
    { label: 'Blocked', value: stats.blocked },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map(c => (
          <div key={c.label} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <div className="text-3xl font-bold text-white">{c.value}</div>
            <div className="text-sm text-gray-400 mt-1">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
