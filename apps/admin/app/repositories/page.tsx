import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Repository } from '@ai-skillops/shared';

export default async function RepositoriesPage() {
  const supabase = createSupabaseServerClient();
  const { data: repos } = await supabase
    .from('repositories')
    .select('*')
    .order('skills_sh_installs', { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Repositories</h1>
      <form action="/api/repositories" method="POST" className="flex gap-2 mb-6">
        <input
          name="githubUrl"
          type="url"
          placeholder="https://github.com/owner/repo"
          required
          className="flex-1 border border-gray-700 rounded bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
        />
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-sm font-medium">
          Add Repository
        </button>
      </form>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-800">
            <th className="pb-3 pr-4">Repository</th>
            <th className="pb-3 pr-4">Source</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3 pr-4">Installs</th>
            <th className="pb-3">Last Scanned</th>
          </tr>
        </thead>
        <tbody>
          {((repos as Repository[]) ?? []).map(r => (
            <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
              <td className="py-3 pr-4">
                <a href={r.github_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                  {r.github_owner}/{r.github_repo}
                </a>
              </td>
              <td className="py-3 pr-4 text-gray-400">{r.source}</td>
              <td className="py-3 pr-4">
                <span className={`px-2 py-0.5 rounded text-xs ${
                  r.status === 'active' ? 'bg-green-900 text-green-300' :
                  r.status === 'archived' ? 'bg-gray-800 text-gray-400' :
                  'bg-yellow-900 text-yellow-300'
                }`}>{r.status}</span>
              </td>
              <td className="py-3 pr-4">{r.skills_sh_installs.toLocaleString()}</td>
              <td className="py-3 text-gray-400">
                {r.last_scanned_at ? new Date(r.last_scanned_at).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
