import test from 'node:test';
import assert from 'node:assert/strict';
import { getSeasonalMessage } from '../../src/season.js';

test('seasonal message prepares visitors before premiums are published', () => {
  const message = getSeasonalMessage(new Date('2026-09-05T12:00:00+02:00'));

  assert.equal(message.eyebrow, 'Vooruitblik 2027');
  assert.match(message.text, /12 november 2026/);
});

test('seasonal message shows the December switching deadline', () => {
  const message = getSeasonalMessage(new Date('2026-12-03T12:00:00+01:00'));

  assert.equal(message.eyebrow, 'Overstapseizoen 2027');
  assert.match(message.title, /31 december 2026/);
});

test('seasonal message explains the January exception', () => {
  const message = getSeasonalMessage(new Date('2027-01-14T12:00:00+01:00'));

  assert.match(message.text, /1 februari 2027/);
});
