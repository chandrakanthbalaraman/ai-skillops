import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Artifact } from '@ai-skillops/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

function StatusBadge({ status }: { status: Artifact['status'] }) {
  if (status === 'approved') return <Badge variant="outline" className="text-green-400 border-green-400/30">approved</Badge>;
  if (status === 'blocked') return <Badge variant="destructive">blocked</Badge>;
  return <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">pending</Badge>;
}

function ScoreBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs tabular-nums">{value}</span>
    </div>
  );
}

export default async function ArtifactsPage() {
  const supabase = createSupabaseServerClient();
  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('*')
    .order('combined_score', { ascending: false })
    .limit(200);

  const list = (artifacts as Artifact[]) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Artifacts</h1>
        <p className="text-muted-foreground text-sm mt-1">Browse and filter all registered artifacts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Artifacts</CardTitle>
          <CardDescription>{list.length} artifacts · sorted by combined score</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No artifacts yet. Run the scanner to populate the registry.
                  </TableCell>
                </TableRow>
              ) : (
                list.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{a.kind}</Badge>
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
