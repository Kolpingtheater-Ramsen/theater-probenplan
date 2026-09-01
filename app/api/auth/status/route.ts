import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth';
import { getDatabase } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const count = getDatabase().prepare('SELECT COUNT(*) AS count FROM profiles').get() as { count: number };
  const user = getAuthUser(request);
  return NextResponse.json({ needsSetup: count.count === 0, authenticated: Boolean(user), user });
}
