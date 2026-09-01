import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, deleteSession, sameOrigin } from '@/lib/server/auth';

export function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 403 });
  deleteSession(request);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
