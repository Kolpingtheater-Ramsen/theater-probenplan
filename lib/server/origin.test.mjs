import assert from 'node:assert/strict';
import test from 'node:test';
import { originMatchesHosts } from './origin.mjs';

test('accepts the public host forwarded by a reverse proxy', () => {
  assert.equal(
    originMatchesHosts('https://probenplan.logge.top', [
      'buehnenplan:3000',
      'probenplan.logge.top',
      'buehnenplan:3000',
    ]),
    true,
  );
});

test('accepts a direct same-origin request', () => {
  assert.equal(
    originMatchesHosts('http://localhost:3000', ['localhost:3000']),
    true,
  );
});

test('accepts a comma-separated forwarded-host chain', () => {
  assert.equal(
    originMatchesHosts('https://probenplan.logge.top', [
      'probenplan.logge.top, edge.internal',
    ]),
    true,
  );
});

test('rejects a different browser origin', () => {
  assert.equal(
    originMatchesHosts('https://example.org', [
      'buehnenplan:3000',
      'probenplan.logge.top',
    ]),
    false,
  );
});

test('rejects a malformed origin', () => {
  assert.equal(
    originMatchesHosts('not a URL', ['probenplan.logge.top']),
    false,
  );
});
