import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Artifact } from '@ai-skillops/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type ArtifactWithFindings = Artifact & { safety_findings: { severity: string; kind: string; evidence: string }[] };

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'critical') return <Badge variant="destructive" className="text-xs">{severity}</Badge>;
  if (severity === 'high') return <Badge variant="outline" className="text-red-400 border-red-400/30 text-xs">{severity}</Badge>;
  if (severity === 'medium') return <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 text-xs">{severity}</Badge>;
  return <Badge variant="secondary" className="text-xs">{severity}</Badge>;
}

export default async function ReviewPage() {
  const supabase = createSupabaseAdminClient();
  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('*, safety_findings(*)')
    .eq('status', 'pending_review')
    .order('combined_score', { ascending: false });

  const list = (artifacts as ArtifactWithFindings[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pending Review</h1>
          <p className="text-muted-foreground text-sm mt-1">Approve or block artifacts before they go public</p>
        </div>
        {list.length > 0 && (
          <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
            {list.length} items waiting
          </Badge>
        )}
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-3">✓</div>
            <p className="text-muted-foreground">All caught up — no artifacts pending review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map(a => (
            <Card key={a.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{a.name}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">{a.kind}</Badge>
                      <span className="text-xs text-muted-foreground">Safety {a.safety_score}/100</span>
                      <span className="text-xs text-muted-foreground">Score {a.combined_score}/100</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <form action={`/api/artifacts/${a.id}/approve`} method="POST">
                      <Button type="submit" size="sm" variant="outline" className="text-green-400 border-green-400/30 hover:bg-green-400/10">
                        Approve
                      </Button>
                    </form>
                    <form action={`/api/artifacts/${a.id}/block`} method="POST">
                      <Button type="submit" size="sm" variant="destructive">
                        Block
                      </Button>
                    </form>
                  </div>
                </div>
              </CardHeader>
              {a.safety_findings.length > 0 && (
                <>
                  <Separator />
                  <CardContent className="pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {a.safety_findings.length} safety finding{a.safety_findings.length !== 1 ? 's' : ''}
                    </p>
                    <div className="space-y-1.5">
                      {a.safety_findings.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <SeverityBadge severity={f.severity} />
                          <span className="text-muted-foreground">{f.kind}</span>
                          <code className="text-xs text-muted-foreground/70 truncate max-w-xs">{f.evidence}</code>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
