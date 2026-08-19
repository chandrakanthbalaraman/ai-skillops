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

export async function POST(request: Request) {
  const formData = await request.formData();
  const githubUrl = formData.get('githubUrl');

  if (typeof githubUrl !== 'string' || !githubUrl) {
    return NextResponse.json({ error: 'githubUrl is required' }, { status: 400 });
  }

  const parsed = parseGitHubUrl(githubUrl);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('repositories')
    .insert({
      github_owner: parsed.owner,
      github_repo: parsed.repo,
      github_url: `https://github.com/${parsed.owner}/${parsed.repo}`,
      source: 'manual',
      status: 'pending',
      skills_sh_installs: 0,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.redirect(new URL('/repositories', request.url), { status: 303 });
}
