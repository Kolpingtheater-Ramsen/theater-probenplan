import assert from 'node:assert/strict';
import test from 'node:test';
import {
  eventDateInBerlin,
  eventsCoveredByAbsence,
  isEventVisibleToMember,
} from './event-visibility.mjs';

const visibility = { techOnly: true, costumeOnly: true };

test('uses the calendar date in Europe/Berlin', () => {
  assert.equal(eventDateInBerlin('2026-09-03T17:00:00.000Z'), '2026-09-03');
  assert.equal(eventDateInBerlin('2026-09-03T23:30:00.000Z'), '2026-09-04');
  assert.equal(eventDateInBerlin('invalid'), null);
});

test('matches the existing group visibility rules', () => {
  assert.equal(
    isEventVisibleToMember('Creepshow-Ensemble', 'Jugend', visibility),
    true,
  );
  assert.equal(
    isEventVisibleToMember('Technik', 'Ensemble', visibility),
    false,
  );
  assert.equal(
    isEventVisibleToMember('Technik & Ensemble', 'Ensemble', visibility),
    true,
  );
  assert.equal(
    isEventVisibleToMember('Kostümteam', 'Ensemble', visibility),
    false,
  );
});

test('returns visible events inside an inclusive absence range', () => {
  const events = [
    {
      id: 'before',
      group: 'Alle',
      startsAt: '2026-09-02T18:00:00+02:00',
    },
    {
      id: 'first',
      group: 'Ensemble',
      startsAt: '2026-09-03T19:00:00+02:00',
    },
    {
      id: 'hidden',
      group: 'Kostümteam',
      startsAt: '2026-09-04T10:00:00+02:00',
    },
    {
      id: 'last',
      group: 'Alle',
      startsAt: '2026-09-05T19:00:00+02:00',
    },
    {
      id: 'after',
      group: 'Alle',
      startsAt: '2026-09-06T19:00:00+02:00',
    },
  ];

  assert.deepEqual(
    eventsCoveredByAbsence(
      events,
      '2026-09-03',
      '2026-09-05',
      'Ensemble',
      visibility,
    ).map((event) => event.id),
    ['first', 'last'],
  );
});
