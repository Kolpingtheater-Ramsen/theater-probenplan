import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, hashPassword, sameOrigin } from '@/lib/server/auth';
import { getDatabase } from '@/lib/server/db';

const schema = z.object({ password: z.string().min(12).max(200) });

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 403 });
  const user = getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Bitte zuerst anmelden.' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Das neue Passwort muss mindestens 12 Zeichen haben.' }, { status: 400 });

  const db = getDatabase();
  db.transaction(() => {
    db.prepare('UPDATE profiles SET password_hash = ?, failed_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
      .run(hashPassword(parsed.data.password), user.userId);
    db.prepare('DELETE FROM temporary_credentials WHERE user_id = ?').run(user.userId);
    db.prepare("INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES (?, 'password.changed', 'profile', ?)")
      .run(user.userId, user.userId);
  })();
  return NextResponse.json({ ok: true });
}
