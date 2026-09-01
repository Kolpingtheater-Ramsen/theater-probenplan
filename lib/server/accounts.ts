import { randomBytes, randomUUID } from 'node:crypto';
import { hashPassword } from './auth';
import { getDatabase, organizationMemberSeeds } from './db';

export function generateTemporaryPassword() {
  return `Buehne-${randomBytes(9).toString('base64url')}!`;
}

export function seedMemberAccounts() {
  const db = getDatabase();
  const findProfile = db.prepare(
    'SELECT user_id AS userId, email FROM profiles WHERE lower(email) = lower(?) OR lower(display_name) = lower(?) LIMIT 1',
  );
  const insertProfile = db.prepare(
    'INSERT INTO profiles (user_id, email, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)',
  );
  const insertCredential = db.prepare(
    'INSERT INTO temporary_credentials (user_id, temporary_password) VALUES (?, ?)',
  );
  const updateProfile = db.prepare(
    'UPDATE profiles SET email = ?, display_name = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
  );
  const updateMemberEmail = db.prepare(
    'UPDATE members SET email = ? WHERE lower(name) = lower(?)',
  );

  db.transaction(() => {
    for (const member of organizationMemberSeeds) {
      const existing = findProfile.get(member.email, member.name) as
        | { userId: string; email: string }
        | undefined;
      if (existing) {
        updateProfile.run(
          member.email,
          member.name,
          member.profileRole,
          existing.userId,
        );
        updateMemberEmail.run(member.email, member.name);
        continue;
      }
      const userId = randomUUID();
      const temporaryPassword = generateTemporaryPassword();
      insertProfile.run(
        userId,
        member.email,
        member.name,
        hashPassword(temporaryPassword),
        member.profileRole,
      );
      insertCredential.run(userId, temporaryPassword);
      updateMemberEmail.run(member.email, member.name);
    }
  })();
}
