import test from 'node:test';
import assert from 'node:assert/strict';
import { getDateRange, parseInputDate } from '../src/dates.mjs';

test('parseInputDate expands date-only start and end', () => {
  assert.equal(parseInputDate('2026-05-28').getHours(), 0);
  assert.equal(parseInputDate('2026-05-28', true).getHours(), 23);
});

test('getDateRange uses same day when only startDate is provided', () => {
  const range = getDateRange({ startDate: '2026-05-28' });
  assert.equal(range.startDate, '2026-05-28');
  assert.equal(range.endDate, '2026-05-28');
});
