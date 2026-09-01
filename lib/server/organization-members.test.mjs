import assert from 'node:assert/strict';
import test from 'node:test';
import {
  legacyDemoEmails,
  organizationMemberSeeds,
} from './organization-members.mjs';

test('contains the current public ensemble and crew roster', () => {
  assert.equal(organizationMemberSeeds.length, 41);
  assert.equal(
    organizationMemberSeeds.find((member) => member.name === 'Yunus')?.roleName,
    'Dr. Adrian Düsterwald',
  );
  assert.equal(
    organizationMemberSeeds.find((member) => member.name === 'Sebastian')
      ?.roleName,
    'Butler Wilson / Regie',
  );
});

test('uses unique account identifiers and only the intended administrators', () => {
  const emails = organizationMemberSeeds.map((member) => member.email);
  const names = organizationMemberSeeds.map((member) => member.name);
  assert.equal(new Set(emails).size, emails.length);
  assert.equal(new Set(names).size, names.length);
  assert.deepEqual(
    organizationMemberSeeds
      .filter((member) => member.profileRole === 'admin')
      .map((member) => member.name)
      .sort(),
    ['Sebastian', 'Yunus'],
  );
});

test('does not retain any legacy demo account', () => {
  const realEmails = new Set(
    organizationMemberSeeds.map((member) => member.email),
  );
  for (const email of legacyDemoEmails)
    assert.equal(realEmails.has(email), false);
});
