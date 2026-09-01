import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession, sameOrigin, setSessionCookie, verifyPassword } from '@/lib/server/auth';
import { getDatabase } from '@/lib/server/db';

const loginSchema = z.object({ email: z.email().transform((value) => value.toLowerCase()), password: z.string().min(1).max(200) });
type LoginRow = { userId: string; passwordHash: string; failedAttempts: number; lockedUntil: string | null };

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 403 });
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'E-Mail oder Passwort ist falsch.' }, { status: 401 });
  const db = getDatabase();
  const row = db.prepare('SELECT user_id AS userId, password_hash AS passwordHash, failed_attempts AS failedAttempts, locked_until AS lockedUntil FROM profiles WHERE email = ?')
    .get(parsed.data.email) as LoginRow | undefined;
  if (!row || (row.lockedUntil && row.lockedUntil > new Date().toISOString()) || !verifyPassword(parsed.data.password, row.passwordHash)) {
    if (row) {
      const attempts = row.failedAttempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null;
      db.prepare('UPDATE profiles SET failed_attempts = ?, locked_until = ? WHERE user_id = ?').run(attempts, lockedUntil, row.userId);
    }
    return NextResponse.json({ error: 'E-Mail oder Passwort ist falsch. Nach 5 Versuchen wird der Zugang 15 Minuten gesperrt.' }, { status: 401 });
  }
  db.prepare('UPDATE profiles SET failed_attempts = 0, locked_until = NULL WHERE user_id = ?').run(row.userId);
  const session = createSession(row.userId);
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, session.token, session.expiresAt);
  return response;
}
