import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('artifacts')
    .update({ status: 'approved' })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.redirect(
    new URL('/review', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001')
  );
}
