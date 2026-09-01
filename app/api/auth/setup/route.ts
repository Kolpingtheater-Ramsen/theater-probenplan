import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession, hashPassword, sameOrigin, setSessionCookie } from '@/lib/server/auth';
import { getDatabase, seedOrganization } from '@/lib/server/db';

const setupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(200),
});

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 403 });
  const db = getDatabase();
  const count = db.prepare('SELECT COUNT(*) AS count FROM profiles').get() as { count: number };
  if (count.count > 0) return NextResponse.json({ error: 'Die Einrichtung ist bereits abgeschlossen.' }, { status: 409 });
  const parsed = setupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Bitte Name, gültige E-Mail und mindestens 12 Zeichen Passwort angeben.' }, { status: 400 });
  const userId = randomUUID();
  try {
    db.prepare("INSERT INTO profiles (user_id, email, display_name, password_hash, role) VALUES (?, ?, ?, ?, 'admin')")
      .run(userId, parsed.data.email, parsed.data.name, hashPassword(parsed.data.password));
    seedOrganization();
  } catch {
    return NextResponse.json({ error: 'Die Einrichtung konnte nicht gespeichert werden.' }, { status: 409 });
  }
  const session = createSession(userId);
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, session.token, session.expiresAt);
  return response;
}
