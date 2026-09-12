import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const reminderSource = readFileSync(
  new URL('../../supabase/functions/send-reminder/index.ts', import.meta.url),
  'utf8'
);
const reminderMigration = readFileSync(
  new URL('../../supabase/migrations/20260912175602_add_scheduled_reminder.sql', import.meta.url),
  'utf8'
);

test('seasonal reminder contains an HTML button and plain-text fallback', () => {
  assert.match(reminderSource, /Vergelijk mijn jaarlasten: \$\{calculatorUrl\}/);
  assert.match(reminderSource, /<a href="\$\{calculatorUrl\}"[^>]*>Vergelijk mijn jaarlasten<\/a>/);
});

test('seasonal reminder links are attributable in Umami', () => {
  assert.match(reminderSource, /utm_source=zorgvergelijker/);
  assert.match(reminderSource, /utm_medium=email/);
  assert.match(reminderSource, /utm_campaign=\$\{CAMPAIGN\}/);
  assert.match(reminderSource, /utm_content=hoofdknop/);
});

test('seasonal reminder is scheduled and prevents repeat delivery', () => {
  assert.match(reminderMigration, /send-zorgvergelijker-reminder-2027/);
  assert.match(reminderMigration, /\*\/15 9-21 13-15 11 \*/);
  assert.match(reminderMigration, /waitlist_email_log_one_launch_reminder_idx/);
  assert.match(reminderSource, /\.is\("reminder_sent_at", null\)/);
});
