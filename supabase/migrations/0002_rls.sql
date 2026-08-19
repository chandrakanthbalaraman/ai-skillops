-- Enable RLS on all six tables
alter table repositories enable row level security;
alter table artifacts enable row level security;
alter table scans enable row level security;
alter table safety_findings enable row level security;
alter table classifications enable row level security;
alter table install_events enable row level security;

-- Public read: only approved artifacts (CLI search/sync)
create policy "anon can read approved artifacts"
  on artifacts for select to anon
  using (status = 'approved');

-- anon can read classifications for approved artifacts only
create policy "anon can read classifications for approved artifacts"
  on classifications for select to anon
  using (
    exists (
      select 1 from artifacts a
      where a.id = artifact_id and a.status = 'approved'
    )
  );

-- anon can insert install_events (anonymous analytics)
create policy "anon can insert install events"
  on install_events for insert to anon
  with check (true);

-- service_role bypasses RLS for the scanner and admin API routes
-- (Supabase service role bypasses RLS by default - no policy needed)
