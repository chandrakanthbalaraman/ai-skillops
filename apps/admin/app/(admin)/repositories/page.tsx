import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Repository } from '@ai-skillops/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function StatusBadge({ status }: { status: Repository['status'] }) {
  if (status === 'active') return <Badge variant="outline" className="text-green-400 border-green-400/30">active</Badge>;
  if (status === 'archived') return <Badge variant="outline" className="text-muted-foreground">archived</Badge>;
  return <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">{status}</Badge>;
}

export default async function RepositoriesPage() {
  const supabase = createSupabaseServerClient();
  const { data: repos } = await supabase
    .from('repositories')
    .select('*')
    .order('skills_sh_installs', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Repositories</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage and monitor registered repositories</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Repository</CardTitle>
          <CardDescription>Paste a GitHub URL to register a new repository for scanning</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/repositories" method="POST" className="flex gap-2">
            <Input
              name="githubUrl"
              type="url"
              placeholder="https://github.com/owner/repo"
              required
              className="flex-1"
            />
            <Button type="submit">Add Repository</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Repositories</CardTitle>
          <CardDescription>{repos?.length ?? 0} repositories registered</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Repository</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Installs</TableHead>
                <TableHead>Last Scanned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {((repos as Repository[]) ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No repositories yet. Add one above.
                  </TableCell>
                </TableRow>
              ) : (
                ((repos as Repository[]) ?? []).map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <a
                        href={r.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:underline font-medium"
                      >
                        {r.github_owner}/{r.github_repo}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{r.source}</Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.skills_sh_installs.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.last_scanned_at ? new Date(r.last_scanned_at).toLocaleDateString() : '—'}
                    </TableCell>
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
