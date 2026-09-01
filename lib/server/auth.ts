import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from './db';

const cookieName = 'theater_session';
const sessionDays = 30;

export type AuthUser = { userId: string; email: string; displayName: string; role: 'member' | 'admin'; mustChangePassword: boolean };

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createSession(userId: string) {
  const db = getDatabase();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionDays * 86_400_000);
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash(token), userId, expiresAt.toISOString());
  return { token, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(cookieName, token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(cookieName, '', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
}

export function getAuthUser(request: NextRequest): AuthUser | null {
  const token = request.cookies.get(cookieName)?.value;
  if (!token) return null;
  const row = getDatabase().prepare(`SELECT p.user_id AS userId, p.email, p.display_name AS displayName, p.role,
      EXISTS(SELECT 1 FROM temporary_credentials tc WHERE tc.user_id = p.user_id) AS mustChangePassword
    FROM sessions s JOIN profiles p ON p.user_id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`).get(tokenHash(token), new Date().toISOString()) as (Omit<AuthUser, 'mustChangePassword'> & { mustChangePassword: number }) | undefined;
  return row ? { ...row, mustChangePassword: Boolean(row.mustChangePassword) } : null;
}

export function deleteSession(request: NextRequest) {
  const token = request.cookies.get(cookieName)?.value;
  if (token) getDatabase().prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
}

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === request.nextUrl.host; } catch { return false; }
}
