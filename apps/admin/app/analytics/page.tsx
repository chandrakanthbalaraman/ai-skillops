import { createSupabaseServerClient } from '@/lib/supabase/server';

type InstallRow = { artifact_id: string; count: number };
type StackRow = { stack_fingerprint: string; count: number };

export default async function AnalyticsPage() {
  const supabase = createSupabaseServerClient();

  const { data: topInstalled } = await supabase
    .from('install_events')
    .select('artifact_id, count:artifact_id.count()')
    .limit(10);

  const { data: stackBreakdown } = await supabase
    .from('install_events')
    .select('stack_fingerprint, count:stack_fingerprint.count()')
    .limit(20);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <section>
        <h2 className="text-lg font-semibold mb-4">Top Installed Artifacts</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="px-5 py-3">Artifact ID</th>
                <th className="px-5 py-3">Installs</th>
              </tr>
            </thead>
            <tbody>
              {((topInstalled ?? []) as InstallRow[]).map(row => (
                <tr key={row.artifact_id} className="border-b border-gray-800/50">
                  <td className="px-5 py-3 text-indigo-400">{row.artifact_id}</td>
                  <td className="px-5 py-3">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Stack Breakdown (anonymous)</h2>
        <p className="text-sm text-gray-400 mb-3">Stack fingerprints are SHA-256 hashes — no identifying information.</p>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="px-5 py-3">Stack Fingerprint</th>
                <th className="px-5 py-3">Count</th>
              </tr>
            </thead>
            <tbody>
              {((stackBreakdown ?? []) as StackRow[]).map(row => (
                <tr key={row.stack_fingerprint} className="border-b border-gray-800/50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-300">
                    {row.stack_fingerprint.slice(0, 16)}...
                  </td>
                  <td className="px-5 py-3">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
