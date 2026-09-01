import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { schemaStatements } from '@/db/schema';

export const organizationMemberSeeds = [
  { email: 'yunus@kolpingtheater-ramsen.de', name: 'Yunus', groupName: 'Ensemble', roleName: 'Spielbetrieb', initials: 'YU', active: 1, profileRole: 'admin' },
  { email: 'sebastian@kolpingtheater-ramsen.de', name: 'Sebastian', groupName: 'Ensemble', roleName: 'Probenleitung', initials: 'SE', active: 1, profileRole: 'admin' },
  { email: 'technik@kolpingtheater-ramsen.de', name: 'Technik-Admin', groupName: 'Technik', roleName: 'Technikleitung', initials: 'TA', active: 1, profileRole: 'admin' },
  { email: 'logge@kolpingtheater-ramsen.de', name: 'Logge', groupName: 'Ensemble', roleName: 'Bote / Diener', initials: 'LO', active: 1, profileRole: 'member' },
  { email: 'noah.becker@kolpingtheater-ramsen.de', name: 'Noah Becker', groupName: 'Jugend', roleName: '', initials: 'NB', active: 1, profileRole: 'member' },
  { email: 'mia.wagner@kolpingtheater-ramsen.de', name: 'Mia Wagner', groupName: 'Jugend', roleName: '', initials: 'MW', active: 0, profileRole: 'member' },
  { email: 'jonas.hoffmann@kolpingtheater-ramsen.de', name: 'Jonas Hoffmann', groupName: 'Ensemble', roleName: '', initials: 'JH', active: 1, profileRole: 'member' },
  { email: 'sarah.klein@kolpingtheater-ramsen.de', name: 'Sarah Klein', groupName: 'Ensemble', roleName: '', initials: 'SK', active: 1, profileRole: 'member' },
  { email: 'tobias.hartmann@kolpingtheater-ramsen.de', name: 'Tobias Hartmann', groupName: 'Ensemble', roleName: '', initials: 'TH', active: 0, profileRole: 'member' },
  { email: 'emilia.schmitt@kolpingtheater-ramsen.de', name: 'Emilia Schmitt', groupName: 'Jugend', roleName: '', initials: 'ES', active: 1, profileRole: 'member' },
  { email: 'felix.braun@kolpingtheater-ramsen.de', name: 'Felix Braun', groupName: 'Technik', roleName: '', initials: 'FB', active: 1, profileRole: 'member' },
] as const;

const databasePath = process.env.DATABASE_PATH
  ? resolve(process.env.DATABASE_PATH)
  : process.env.NODE_ENV === 'production'
    ? '/data/theater.db'
    : resolve('.data/theater.db');

declare global {
  var theaterDatabase: Database.Database | undefined;
}

function createDatabase() {
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.pragma('busy_timeout = 5000');
  database.transaction(() => {
    for (const statement of schemaStatements) database.prepare(statement).run();
  })();
  database.pragma('optimize');
  return database;
}

export function getDatabase() {
  globalThis.theaterDatabase ??= createDatabase();
  return globalThis.theaterDatabase;
}

export function seedOrganization() {
  const db = getDatabase();
  const count = db.prepare('SELECT COUNT(*) AS count FROM events').get() as { count: number };
  const events = [
    ['weekly-03', 3, 'SEP', 'Donnerstag', 'Wochenprobe „Creepshow“', '19:00–21:00', 'Kolpingheim · Großer Saal', 'Creepshow-Ensemble', 24, 'weekly', 'orange', 0, '2026-09-03T19:00:00+02:00', '2026-09-03T21:00:00+02:00'],
    ['scene-07', 7, 'SEP', 'Montag', 'Szenenprobe · Villa Falkenstein', '18:30–20:30', 'Kolpingheim · Kleiner Saal', 'Ensemble', 14, 'other', 'blue', 0, '2026-09-07T18:30:00+02:00', '2026-09-07T20:30:00+02:00'],
    ['costume-12', 12, 'SEP', 'Samstag', 'Maskenball · Kostüm & Maske', '10:00–13:00', 'Fundus', 'Kostümteam', 6, 'other', 'violet', 0, '2026-09-12T10:00:00+02:00', '2026-09-12T13:00:00+02:00'],
    ['tech-16', 16, 'SEP', 'Mittwoch', 'Technikdurchlauf · Open-Air-Bühne', '18:00–21:00', 'Bühne', 'Technik & Ensemble', 18, 'other', 'green', 1, '2026-09-16T18:00:00+02:00', '2026-09-16T21:00:00+02:00'],
    ['weekly-24', 24, 'SEP', 'Donnerstag', 'Wochenprobe · Creepshow-Finale', '19:00–21:00', 'Kolpingheim · Großer Saal', 'Alle', 31, 'weekly', 'orange', 0, '2026-09-24T19:00:00+02:00', '2026-09-24T21:00:00+02:00'],
  ] as const;

  db.transaction(() => {
    const findMember = db.prepare('SELECT id, email FROM members WHERE lower(name) = lower(?) LIMIT 1');
    const insertMember = db.prepare('INSERT INTO members (email, name, group_name, role_name, initials, active) VALUES (?, ?, ?, ?, ?, ?)');
    const updateMember = db.prepare(`UPDATE members SET email = COALESCE(email, ?), group_name = ?, role_name = ?, initials = ?, active = ? WHERE id = ?`);
    for (const member of organizationMemberSeeds) {
      const existing = findMember.get(member.name) as { id: number; email: string | null } | undefined;
      if (existing) updateMember.run(member.email, member.groupName, member.roleName, member.initials, member.active, existing.id);
      else insertMember.run(member.email, member.name, member.groupName, member.roleName, member.initials, member.active);
    }
    if (count.count > 0) return;
    const insertEvent = db.prepare('INSERT INTO events (id, day, month, weekday, title, time_label, place, group_name, people, kind, tone, locked, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const event of events) insertEvent.run(...event);
    db.prepare("INSERT INTO polls (id, title, description) VALUES ('maskenball', 'Zusatzprobe · Maskenball', 'Welcher Termin passt dir?')").run();
    const insertOption = db.prepare('INSERT INTO poll_options (id, poll_id, day_label, time_label, votes_seed) VALUES (?, ?, ?, ?, ?)');
    insertOption.run('fri', 'maskenball', 'FR · 18 SEP', '18:30–21:00', 12);
    insertOption.run('sat', 'maskenball', 'SA · 19 SEP', '14:00–17:00', 19);
    insertOption.run('sun', 'maskenball', 'SO · 20 SEP', '10:00–13:00', 8);
    db.prepare('INSERT INTO organization_settings (id, settings_json) VALUES (1, ?)').run(JSON.stringify({ automations: { weekly: true, noResponse: true, parents: true }, groupVisibility: { techOnly: true, costumeOnly: true } }));
  })();
}
