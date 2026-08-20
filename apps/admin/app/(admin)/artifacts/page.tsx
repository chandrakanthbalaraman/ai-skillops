import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Artifact } from '@ai-skillops/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/search-input';
import { Suspense } from 'react';

function StatusBadge({ status }: { status: Artifact['status'] }) {
  if (status === 'approved') return (
    <Badge variant="outline" className="text-green-400 border-green-400/30 gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />approved
    </Badge>
  );
  if (status === 'blocked') return <Badge variant="destructive">blocked</Badge>;
  return <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">pending</Badge>;
}

function ScoreBar({ value, label }: { value: number; label?: string }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-6 text-right">{value}</span>
    </div>
  );
}

const KIND_COLORS: Record<string, string> = {
  skill: 'text-indigo-400 border-indigo-400/30',
  rule: 'text-purple-400 border-purple-400/30',
  context: 'text-blue-400 border-blue-400/30',
  command: 'text-cyan-400 border-cyan-400/30',
  workflow: 'text-pink-400 border-pink-400/30',
};

export default async function ArtifactsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createSupabaseAdminClient();
  const q = searchParams.q?.trim() ?? '';

  let query = supabase
    .from('artifacts')
    .select('*')
    .order('combined_score', { ascending: false })
    .limit(200);

  if (q) {
    query = query.ilike('name', `%${q}%`);
  }

  const { data: artifacts } = await query;
  const list = (artifacts as Artifact[]) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Artifacts</h1>
        <p className="text-muted-foreground text-sm mt-1">Browse and manage all registered skills, rules, and contexts</p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">All Artifacts</CardTitle>
              <CardDescription>
                {q ? `${list.length} results for "${q}"` : `${list.length} artifacts · sorted by combined score`}
              </CardDescription>
            </div>
            <div className="w-64">
              <Suspense>
                <SearchInput placeholder="Search artifact name…" />
              </Suspense>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Safety</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    {q ? `No artifacts match "${q}".` : 'No artifacts yet. Run the scanner to populate the registry.'}
                  </TableCell>
                </TableRow>
              ) : (
                list.map(a => (
                  <TableRow key={a.id} className="border-border/40 hover:bg-accent/30 transition-colors">
                    <TableCell className="font-medium max-w-xs truncate">{a.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${KIND_COLORS[a.kind] ?? ''}`}>{a.kind}</Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell><ScoreBar value={a.safety_score} /></TableCell>
                    <TableCell><ScoreBar value={a.combined_score} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
