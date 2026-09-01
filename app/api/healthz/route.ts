import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export function GET() {
  try {
    const result = getDatabase().prepare('SELECT 1 AS ok').get() as { ok: number };
    return NextResponse.json({ status: result.ok === 1 ? 'ok' : 'degraded' }, { status: result.ok === 1 ? 200 : 503 });
  } catch {
    return NextResponse.json({ status: 'unavailable' }, { status: 503 });
  }
}
