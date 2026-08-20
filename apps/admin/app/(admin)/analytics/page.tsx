import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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

  const top = (topInstalled ?? []) as InstallRow[];
  const stacks = (stackBreakdown ?? []) as StackRow[];
  const totalInstalls = top.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Install counts and stack breakdown</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Installed Artifacts</CardTitle>
            <CardDescription>{totalInstalls} total install events tracked</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Artifact ID</TableHead>
                  <TableHead className="text-right">Installs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      No installs recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  top.map((row, i) => (
                    <TableRow key={row.artifact_id}>
                      <TableCell className="text-muted-foreground text-sm w-8">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-400 truncate max-w-[180px]">
                        {row.artifact_id}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{row.count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stack Breakdown</CardTitle>
            <CardDescription>
              Anonymous SHA-256 fingerprints — no project or user data stored
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stack Fingerprint</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stacks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                      No stack data yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  stacks.map(row => (
                    <TableRow key={row.stack_fingerprint}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {row.stack_fingerprint.slice(0, 12)}…
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
