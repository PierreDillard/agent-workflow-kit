import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isoWeek, localDay, parseDocument, reminders, getStatus } from '../modules/reporting/files/weekly-report-status.mjs';

const notebook = (overrides = {}) => ({ goals_status: 'approved', absence: false,
  skip_report: false, snoozed_until: null, pending: 0, ...overrides });
const current = (overrides = {}) => ({ week: '2026-W38', notebook: notebook(), report: null, ...overrides });

test('ISO year boundaries and Sunday belong to the correct week', () => {
  assert.equal(isoWeek('2021-01-01'), '2020-W53');
  assert.equal(isoWeek('2021-01-04'), '2021-W01');
  assert.equal(isoWeek('2022-01-03'), '2022-W01');
  assert.equal(isoWeek('2026-09-20'), '2026-W38');
  assert.equal(isoWeek('2026-09-21'), '2026-W39');
});
test('Paris date independent of machine timezone including DST', () => {
  assert.equal(localDay(new Date('2026-09-20T22:30:00Z')), '2026-09-21');
  assert.equal(localDay(new Date('2026-03-29T22:30:00Z')), '2026-03-30');
  assert.equal(localDay(new Date('2026-10-25T22:30:00Z')), '2026-10-25');
});
test('first use requests goals and Friday report, not prior missing weeks', () => {
  assert.deepEqual(reminders('2026-09-14', []), ['objectifs à préparer/valider']);
  assert.equal(reminders('2026-09-18', []).length, 2);
});
test('approved goals are quiet midweek; finalized report quiet Friday', () => {
  assert.deepEqual(reminders('2026-09-16', [current()]), []);
  assert.deepEqual(reminders('2026-09-18', [current({ report: { status: 'finalized' } })]), []);
});
test('draft still needs finalization; pending notes survive finalization', () => {
  assert.match(reminders('2026-09-18', [current({ report: { status: 'draft' } })])[0], /bilan/);
  const result = reminders('2026-09-18', [current({ report: { status: 'finalized' },
    notebook: notebook({ pending: 2 }) })]);
  assert.equal(result.length, 1);
  assert.match(result[0], /notes à valider/);
});
test('snooze suppresses all reminders until next local date', () => {
  const record = current({ notebook: notebook({ pending: 3, snoozed_until: '2026-09-19' }) });
  assert.deepEqual(reminders('2026-09-18', [record]), []);
  assert.equal(reminders('2026-09-19', [record]).length, 2);
});
test('absence and skipped reports do not generate arrears', () => {
  for (const flag of ['absence', 'skip_report']) {
    const record = current({ notebook: notebook({ [flag]: true, pending: 1 }) });
    assert.deepEqual(reminders('2026-09-18', [record]), []);
    assert.deepEqual(reminders('2026-09-21', [record]), ['objectifs à préparer/valider']);
  }
});
test('past open notebooks are optional catchup and do not block current goals', () => {
  const result = reminders('2026-09-21', [current()]);
  assert.match(result[0], /objectifs/);
  assert.match(result[1], /rattrapage facultatif/);
});
test('metadata validates identity and states, pending counts do not expose contents', () => {
  const text = '<!-- weekly-report\n' + JSON.stringify({ week: '2026-W38', ...notebook() })
    + '\n-->\nValidation: pending\nVisibilité: internal\nTexte privé\nValidation: approved\n';
  const parsed = parseDocument(text, '2026-W38', 'notebook');
  assert.equal(parsed.pending, 1);
  assert.ok(!JSON.stringify(parsed).includes('Texte privé'));
  assert.throws(() => parseDocument(text, '2026-W39', 'notebook'));
  assert.throws(() => parseDocument('broken', '2026-W38', 'notebook'));
  assert.throws(() => parseDocument('<!-- weekly-report\n{"week":"2026-W38","status":"unknown"}\n-->',
    '2026-W38', 'report'));
});

test('disk collection is bounded and read-only, with explicit failure for corrupt metadata', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'weekly-report-test-'));
  try {
    const reports = join(fixtureRoot, 'tasks/reports');
    mkdirSync(reports, { recursive: true });
    writeFileSync(join(reports, 'config.json'), JSON.stringify({ timezone: 'Europe/Paris' }));
    const document = (metadata) => `<!-- weekly-report\n${JSON.stringify(metadata)}\n-->\n`;
    const notebookPath = join(reports, '2026-W38.carnet.md');
    writeFileSync(notebookPath, document({ week: '2026-W38', ...notebook() })
      + 'Validation: pending\nVisibilité: internal\nInformation privée\n');
    writeFileSync(join(reports, '2026-W38.md'), document({ week: '2026-W38', status: 'finalized' }));
    // An old corrupt document is outside the bounded startup scan.
    writeFileSync(join(reports, '2025-W01.carnet.md'), 'invalid');
    const before = readdirSync(reports).map((name) => [name, readFileSync(join(reports, name), 'utf8')]);
    const result = getStatus(fixtureRoot, new Date('2026-09-18T08:00:00Z'));
    assert.equal(result.messages.length, 1);
    assert.match(result.messages[0], /notes à valider/);
    assert.ok(!JSON.stringify(result).includes('Information privée'));
    assert.deepEqual(getStatus(fixtureRoot, new Date('2026-09-18T08:00:00Z')), result);
    assert.deepEqual(readdirSync(reports).map((name) => [name, readFileSync(join(reports, name), 'utf8')]), before);
    writeFileSync(notebookPath, 'invalid');
    assert.throws(() => getStatus(fixtureRoot, new Date('2026-09-18T08:00:00Z')), /métadonnées/);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
