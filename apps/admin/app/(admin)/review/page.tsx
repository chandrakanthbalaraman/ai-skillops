import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Artifact } from '@ai-skillops/shared';

type ArtifactWithFindings = Artifact & { safety_findings: unknown[] };

export default async function ReviewPage() {
  const supabase = createSupabaseServerClient();
  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('*, safety_findings(*)')
    .eq('status', 'pending_review')
    .order('combined_score', { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Pending Review
        <span className="ml-3 text-base font-normal text-gray-400">
          {artifacts?.length ?? 0} items
        </span>
      </h1>
      <div className="space-y-4">
        {((artifacts as ArtifactWithFindings[]) ?? []).map(a => (
          <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  [{a.kind}] · Safety {a.safety_score}/100 · {a.safety_findings.length} finding(s)
                </div>
              </div>
              <div className="flex gap-2">
                <form action={`/api/artifacts/${a.id}/approve`} method="POST">
                  <button type="submit" className="bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded text-xs font-medium">
                    Approve
                  </button>
                </form>
                <form action={`/api/artifacts/${a.id}/block`} method="POST">
                  <button type="submit" className="bg-red-800 hover:bg-red-700 px-3 py-1.5 rounded text-xs font-medium">
                    Block
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
