import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Artifact } from '@ai-skillops/shared';

export default async function ArtifactsPage() {
  const supabase = createSupabaseServerClient();
  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('*')
    .order('combined_score', { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Artifacts</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-800">
            <th className="pb-3 pr-4">Name</th>
            <th className="pb-3 pr-4">Kind</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3 pr-4">Safety</th>
            <th className="pb-3">Score</th>
          </tr>
        </thead>
        <tbody>
          {((artifacts as Artifact[]) ?? []).map(a => (
            <tr key={a.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
              <td className="py-3 pr-4 text-indigo-400">{a.name}</td>
              <td className="py-3 pr-4 text-gray-400">{a.kind}</td>
              <td className="py-3 pr-4">
                <span className={`px-2 py-0.5 rounded text-xs ${
                  a.status === 'approved' ? 'bg-green-900 text-green-300' :
                  a.status === 'blocked' ? 'bg-red-900 text-red-300' :
                  'bg-yellow-900 text-yellow-300'
                }`}>{a.status}</span>
              </td>
              <td className="py-3 pr-4">{a.safety_score}/100</td>
              <td className="py-3">{a.combined_score}/100</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
