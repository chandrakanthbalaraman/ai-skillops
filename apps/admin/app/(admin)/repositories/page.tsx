import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Repository } from '@ai-skillops/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/search-input';
import { Suspense } from 'react';

function StatusBadge({ status }: { status: Repository['status'] }) {
  if (status === 'active') return (
    <Badge variant="outline" className="text-green-400 border-green-400/30 gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />active
    </Badge>
  );
  if (status === 'scanning') return (
    <Badge variant="outline" className="text-blue-400 border-blue-400/30 gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />scanning
    </Badge>
  );
  if (status === 'archived') return <Badge variant="outline" className="text-muted-foreground">archived</Badge>;
  return <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">{status}</Badge>;
}

export default async function RepositoriesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createSupabaseAdminClient();
  const q = searchParams.q?.trim() ?? '';

  let query = supabase
    .from('repositories')
    .select('*')
    .order('skills_sh_installs', { ascending: false })
    .limit(200);

  if (q) {
    query = query.or(`github_owner.ilike.%${q}%,github_repo.ilike.%${q}%`);
  }

  const { data: repos } = await query;
  const list = (repos as Repository[]) ?? [];

  const counts = { active: list.filter(r => r.status === 'active').length, scanning: list.filter(r => r.status === 'scanning').length };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Repositories</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage and monitor registered repositories</p>
      </div>

      {/* Stats row */}
      <div className="flex gap-3">
        <Badge variant="outline" className="text-green-400 border-green-400/30">{counts.active} active</Badge>
        <Badge variant="outline" className="text-blue-400 border-blue-400/30">{counts.scanning} scanning</Badge>
        <Badge variant="secondary">{list.length} shown</Badge>
      </div>

      {/* Add repo */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
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
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Add Repository
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table with search */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">All Repositories</CardTitle>
              <CardDescription>
                {q ? `${list.length} results for "${q}"` : `${list.length} repositories registered`}
              </CardDescription>
            </div>
            <div className="w-64">
              <Suspense>
                <SearchInput placeholder="Search owner or repo…" />
              </Suspense>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Repository</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Installs</TableHead>
                <TableHead>Last Scanned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    {q ? `No repositories match "${q}".` : 'No repositories yet. Add one above.'}
                  </TableCell>
                </TableRow>
              ) : (
                list.map(r => (
                  <TableRow key={r.id} className="border-border/40 hover:bg-accent/30 transition-colors">
                    <TableCell>
                      <a
                        href={r.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
                      >
                        {r.github_owner}/{r.github_repo}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{r.source}</Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
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
