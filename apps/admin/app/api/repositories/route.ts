import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'github.com') return null;
    const parts = parsed.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const githubUrl = (body as Record<string, unknown>)?.github_url;
  if (typeof githubUrl !== 'string' || !githubUrl) {
    return NextResponse.json({ error: 'github_url is required' }, { status: 400 });
  }

  const parsed = parseGitHubUrl(githubUrl);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('repositories')
    .insert({
      github_owner: parsed.owner,
      github_repo: parsed.repo,
      github_url: `https://github.com/${parsed.owner}/${parsed.repo}`,
      source: 'manual',
      status: 'pending',
      skills_sh_installs: 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
