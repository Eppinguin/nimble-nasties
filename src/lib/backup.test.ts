import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_EVERY, NUDGE_EVERY, backupDue, readTime } from './backup.ts';

const now = Date.UTC(2026, 9, 16);

test('no reminder without work to lose', () => {
  assert.equal(backupDue({ now, firstSeen: now - 10 * BACKUP_EVERY, hasWork: false }), false);
});

test('a reminder once the last backup, or the first visit, is old enough', () => {
  assert.equal(backupDue({ now, lastBackup: now - BACKUP_EVERY + 1, hasWork: true }), false);
  assert.equal(backupDue({ now, lastBackup: now - BACKUP_EVERY, hasWork: true }), true);
  assert.equal(backupDue({ now, firstSeen: now - BACKUP_EVERY, hasWork: true }), true);
  assert.equal(backupDue({ now, firstSeen: now - BACKUP_EVERY, lastBackup: now, hasWork: true }), false);
  assert.equal(backupDue({ now, hasWork: true }), false);
});

test('a dismissed reminder waits before asking again', () => {
  const old = now - 3 * BACKUP_EVERY;
  assert.equal(backupDue({ now, lastBackup: old, lastNudge: now - NUDGE_EVERY + 1, hasWork: true }), false);
  assert.equal(backupDue({ now, lastBackup: old, lastNudge: now - NUDGE_EVERY, hasWork: true }), true);
});

test('stored times that are missing or damaged read as none', () => {
  assert.equal(readTime(null), undefined);
  assert.equal(readTime(''), undefined);
  assert.equal(readTime('soon'), undefined);
  assert.equal(readTime('-5'), undefined);
  assert.equal(readTime(String(now)), now);
});
