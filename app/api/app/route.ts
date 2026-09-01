import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser, hashPassword, sameOrigin } from '@/lib/server/auth';
import { getDatabase, seedOrganization } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

const remindersDefault = { dayBefore: true, twoHours: true, changes: true };
const organizationDefault = {
  automations: { weekly: true, noResponse: true, parents: true },
  groupVisibility: { techOnly: true, costumeOnly: true },
};

function unauthorized() {
  return NextResponse.json({ error: 'Bitte zuerst anmelden.' }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: 'Dafür ist eine Adminrolle erforderlich.' }, { status: 403 });
}

function audit(userId: string, action: string, entityType: string, entityId: string) {
  getDatabase().prepare('INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)').run(userId, action, entityType, entityId);
}

export function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  seedOrganization();
  const db = getDatabase();
  const orgSettings = db.prepare('SELECT settings_json AS settingsJson FROM organization_settings WHERE id = 1').get() as { settingsJson: string } | undefined;
  const organization = orgSettings ? JSON.parse(orgSettings.settingsJson) as typeof organizationDefault : organizationDefault;
  const memberProfile = db.prepare('SELECT group_name AS groupName FROM members WHERE lower(email) = lower(?)').get(user.email) as { groupName: string } | undefined;
  const eventRows = db.prepare(`SELECT id, day, month, weekday, title, time_label AS time, place, group_name AS 'group', people, kind AS type, tone, locked, is_custom AS isCustom
    FROM events ORDER BY COALESCE(starts_at, created_at), created_at`).all() as Array<Record<string, unknown> & { group: string; locked: number; isCustom: number }>;
  const allEvents = eventRows.map((row) => ({ ...row, locked: Boolean(row.locked), isCustom: Boolean(row.isCustom) }));
  const events = user.role === 'admin' ? allEvents : allEvents.filter((event) => {
    const group = event.group.toLocaleLowerCase('de-DE');
    const ownGroup = memberProfile?.groupName.toLocaleLowerCase('de-DE') ?? '';
    if (group.includes('alle') || group.includes('creepshow')) return true;
    if (!ownGroup) return false;
    if (group.includes('technik') && organization.groupVisibility.techOnly && !ownGroup.includes('technik') && !group.includes(ownGroup)) return false;
    if (group.includes('kostüm') && organization.groupVisibility.costumeOnly && !ownGroup.includes('kostüm')) return false;
    return group.includes(ownGroup);
  });
  const attendanceRows = db.prepare('SELECT event_id AS eventId, status, reason FROM attendance WHERE user_id = ?').all(user.userId) as Array<{ eventId: string; status: 'yes' | 'no'; reason: string }>;
  const attendanceByEvent = Object.fromEntries(attendanceRows.map((row) => [row.eventId, row.status]));
  const declineReasons = Object.fromEntries(attendanceRows.filter((row) => row.reason).map((row) => [row.eventId, row.reason]));
  const absences = db.prepare('SELECT id, date_from AS "from", date_to AS "to", reason FROM absences WHERE user_id = ? ORDER BY date_from').all(user.userId);
  const members = user.role === 'admin' ? db.prepare(`SELECT m.id, m.name, CASE WHEN m.role_name = '' THEN m.group_name ELSE m.group_name || ' · ' || m.role_name END AS 'group', m.initials,
    COALESCE(c.present, m.active) AS present FROM members m LEFT JOIN checkins c ON c.member_id = m.id AND c.event_id = 'weekly-03' ORDER BY m.name`).all().map((row) => ({ ...(row as object), present: Boolean((row as { present: number }).present) })) : [];
  const poll = db.prepare("SELECT confirmed_option_id AS confirmedOptionId FROM polls WHERE id = 'maskenball'").get() as { confirmedOptionId: string | null };
  const vote = db.prepare("SELECT option_id AS optionId FROM poll_votes WHERE poll_id = 'maskenball' AND user_id = ?").get(user.userId) as { optionId: string } | undefined;
  const pollOptions = db.prepare(`SELECT o.id, o.day_label AS day, o.time_label AS time, o.votes_seed + COUNT(v.user_id) AS votes
    FROM poll_options o LEFT JOIN poll_votes v ON v.option_id = o.id WHERE o.poll_id = 'maskenball' GROUP BY o.id ORDER BY o.rowid`).all();
  const userSettings = db.prepare('SELECT reminders_json AS remindersJson FROM user_settings WHERE user_id = ?').get(user.userId) as { remindersJson: string } | undefined;
  const customEvents = events.filter((event) => (event as { isCustom: boolean }).isCustom);
  return NextResponse.json({
    user,
    events,
    customEvents,
    attendanceByEvent,
    declineReasons,
    absences,
    members,
    pollChoice: vote?.optionId ?? 'sat',
    pollConfirmed: Boolean(poll?.confirmedOptionId),
    pollOptions,
    reminders: userSettings ? JSON.parse(userSettings.remindersJson) : remindersDefault,
    organization,
  });
}

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('attendance'), eventId: z.string().min(1).max(100), status: z.enum(['yes', 'no']), reason: z.string().trim().max(500).default('') }),
  z.object({ action: z.literal('absence.create'), from: z.iso.date(), to: z.iso.date(), reason: z.string().trim().max(500).default('') }),
  z.object({ action: z.literal('absence.delete'), id: z.string().min(1).max(100) }),
  z.object({ action: z.literal('poll.vote'), optionId: z.enum(['fri', 'sat', 'sun']) }),
  z.object({ action: z.literal('poll.confirm') }),
  z.object({ action: z.literal('event.create'), title: z.string().trim().min(3).max(120), date: z.iso.date(), time: z.string().regex(/^\d{2}:\d{2}$/), group: z.string().trim().min(1).max(80), note: z.string().trim().max(1000).default('') }),
  z.object({ action: z.literal('event.delete'), id: z.string().min(1).max(100) }),
  z.object({ action: z.literal('checkin.save'), eventId: z.string().min(1).max(100), members: z.array(z.object({ id: z.number().int().positive(), present: z.boolean() })).max(300) }),
  z.object({ action: z.literal('settings.reminders'), value: z.object({ dayBefore: z.boolean(), twoHours: z.boolean(), changes: z.boolean() }) }),
  z.object({ action: z.literal('settings.organization'), value: z.object({ automations: z.object({ weekly: z.boolean(), noResponse: z.boolean(), parents: z.boolean() }), groupVisibility: z.object({ techOnly: z.boolean(), costumeOnly: z.boolean() }) }) }),
  z.object({ action: z.literal('reminders.send'), eventId: z.string().min(1).max(100).default('weekly-03') }),
  z.object({ action: z.literal('account.create'), name: z.string().trim().min(2).max(80), email: z.email().transform((value) => value.toLowerCase()), password: z.string().min(12).max(200), group: z.string().trim().min(1).max(80), roleName: z.string().trim().max(80).default(''), profileRole: z.enum(['member', 'admin']).default('member') }),
]);

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 403 });
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Die Eingaben sind unvollständig oder ungültig.' }, { status: 400 });
  const db = getDatabase();
  const input = parsed.data;

  if (input.action === 'attendance') {
    const event = db.prepare('SELECT locked FROM events WHERE id = ?').get(input.eventId) as { locked: number } | undefined;
    if (!event) return NextResponse.json({ error: 'Termin nicht gefunden.' }, { status: 404 });
    if (event.locked) return NextResponse.json({ error: 'Die Rückmeldefrist ist abgelaufen.' }, { status: 409 });
    db.prepare(`INSERT INTO attendance (event_id, user_id, status, reason) VALUES (?, ?, ?, ?)
      ON CONFLICT(event_id, user_id) DO UPDATE SET status = excluded.status, reason = excluded.reason, updated_at = CURRENT_TIMESTAMP`)
      .run(input.eventId, user.userId, input.status, input.reason);
    audit(user.userId, 'attendance.updated', 'event', input.eventId);
  } else if (input.action === 'absence.create') {
    if (input.to < input.from) return NextResponse.json({ error: 'Das Enddatum darf nicht vor dem Startdatum liegen.' }, { status: 400 });
    const id = randomUUID();
    db.prepare('INSERT INTO absences (id, user_id, date_from, date_to, reason) VALUES (?, ?, ?, ?, ?)').run(id, user.userId, input.from, input.to, input.reason);
    audit(user.userId, 'absence.created', 'absence', id);
  } else if (input.action === 'absence.delete') {
    const result = db.prepare('DELETE FROM absences WHERE id = ? AND user_id = ?').run(input.id, user.userId);
    if (!result.changes) return NextResponse.json({ error: 'Abwesenheit nicht gefunden.' }, { status: 404 });
    audit(user.userId, 'absence.deleted', 'absence', input.id);
  } else if (input.action === 'settings.reminders') {
    db.prepare(`INSERT INTO user_settings (user_id, reminders_json) VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET reminders_json = excluded.reminders_json, updated_at = CURRENT_TIMESTAMP`).run(user.userId, JSON.stringify(input.value));
  } else if (input.action === 'poll.vote') {
    const poll = db.prepare("SELECT confirmed_option_id AS confirmed FROM polls WHERE id = 'maskenball'").get() as { confirmed: string | null };
    if (poll.confirmed) return NextResponse.json({ error: 'Die Abstimmung ist bereits beendet.' }, { status: 409 });
    db.prepare(`INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES ('maskenball', ?, ?)
      ON CONFLICT(poll_id, user_id) DO UPDATE SET option_id = excluded.option_id, updated_at = CURRENT_TIMESTAMP`).run(input.optionId, user.userId);
    audit(user.userId, 'poll.voted', 'poll', 'maskenball');
  } else {
    if (user.role !== 'admin') return forbidden();
    if (input.action === 'poll.confirm') {
      const winner = db.prepare(`SELECT o.id FROM poll_options o LEFT JOIN poll_votes v ON v.option_id = o.id WHERE o.poll_id = 'maskenball'
        GROUP BY o.id ORDER BY o.votes_seed + COUNT(v.user_id) DESC, o.id LIMIT 1`).get() as { id: string };
      db.prepare("UPDATE polls SET confirmed_option_id = ? WHERE id = 'maskenball'").run(winner.id);
      if (winner.id === 'sat') db.prepare(`INSERT OR IGNORE INTO events (id, day, month, weekday, title, time_label, place, group_name, people, kind, tone, starts_at, ends_at, created_by)
        VALUES ('poll-result', 19, 'SEP', 'Samstag', 'Zusatzprobe · Maskenball', '14:00–17:00', 'Kolpingheim · Großer Saal', 'Alle Getaggten', 19, 'other', 'blue', '2026-09-19T14:00:00+02:00', '2026-09-19T17:00:00+02:00', ?)`).run(user.userId);
      audit(user.userId, 'poll.confirmed', 'poll', 'maskenball');
    } else if (input.action === 'event.create') {
      const start = new Date(`${input.date}T${input.time}:00`);
      if (Number.isNaN(start.getTime())) return NextResponse.json({ error: 'Ungültiges Datum.' }, { status: 400 });
      const end = new Date(start.getTime() + 2 * 60 * 60_000);
      const id = randomUUID();
      const day = start.getDate();
      const month = start.toLocaleDateString('de-DE', { month: 'short' }).replace('.', '').toUpperCase();
      const weekday = start.toLocaleDateString('de-DE', { weekday: 'long' });
      const endTime = end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      db.prepare(`INSERT INTO events (id, day, month, weekday, title, time_label, place, group_name, people, kind, tone, is_custom, starts_at, ends_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 'Kolpingheim · Großer Saal', ?, 0, 'other', 'violet', 1, ?, ?, ?)`)
        .run(id, day, month, weekday, input.title, `${input.time}–${endTime}`, input.group, start.toISOString(), end.toISOString(), user.userId);
      audit(user.userId, 'event.created', 'event', id);
    } else if (input.action === 'event.delete') {
      const result = db.prepare('DELETE FROM events WHERE id = ? AND is_custom = 1').run(input.id);
      if (!result.changes) return NextResponse.json({ error: 'Termin nicht gefunden oder nicht löschbar.' }, { status: 404 });
      audit(user.userId, 'event.deleted', 'event', input.id);
    } else if (input.action === 'checkin.save') {
      db.transaction(() => {
        const statement = db.prepare(`INSERT INTO checkins (event_id, member_id, present, recorded_by) VALUES (?, ?, ?, ?)
          ON CONFLICT(event_id, member_id) DO UPDATE SET present = excluded.present, recorded_by = excluded.recorded_by, recorded_at = CURRENT_TIMESTAMP`);
        for (const member of input.members) statement.run(input.eventId, member.id, Number(member.present), user.userId);
      })();
      audit(user.userId, 'checkin.saved', 'event', input.eventId);
    } else if (input.action === 'settings.organization') {
      db.prepare(`INSERT INTO organization_settings (id, settings_json) VALUES (1, ?)
        ON CONFLICT(id) DO UPDATE SET settings_json = excluded.settings_json, updated_at = CURRENT_TIMESTAMP`).run(JSON.stringify(input.value));
      audit(user.userId, 'settings.updated', 'organization', '1');
    } else if (input.action === 'reminders.send') {
      audit(user.userId, 'reminders.queued', 'event', input.eventId);
    } else if (input.action === 'account.create') {
      const userId = randomUUID();
      const initials = input.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
      try {
        db.transaction(() => {
          db.prepare('INSERT INTO profiles (user_id, email, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)')
            .run(userId, input.email, input.name, hashPassword(input.password), input.profileRole);
          db.prepare('INSERT INTO members (email, name, group_name, role_name, initials) VALUES (?, ?, ?, ?, ?)')
            .run(input.email, input.name, input.group, input.roleName, initials);
        })();
      } catch {
        return NextResponse.json({ error: 'E-Mail ist bereits vergeben oder das Mitglied konnte nicht angelegt werden.' }, { status: 409 });
      }
      audit(user.userId, 'account.created', 'profile', userId);
    }
  }

  return NextResponse.json({ ok: true });
}
