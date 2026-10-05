import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { proposeSkill, approveSkill, activateSkill, presentSkill } from '../templates/project/.workflow/runtime/skill-proposals.mjs';
import { fixture, snapshot, kitRoot, command } from './skill-proposal-fixtures.mjs';

test('04 E1: external package review, exact approval and existing dependency activate without executing imported helpers', context => {
  const setup = fixture(context);
  const provenance = { origin: 'https://example.com/fixture-skills.git', revision: 'a'.repeat(40),
    source_path: 'skills/fixture-guide', license: 'Fixture license retained in LICENSE.txt',
    transformation: 'Synthetic test fixture only; not evidence of a real external source',
    runtime_requirements: 'Imported sentinel must not be executed for review or installation' };
  writeFileSync(join(setup.draft, 'provenance.json'), JSON.stringify(provenance));
  writeFileSync(join(setup.draft, 'skills/fixture-guide/LICENSE.txt'), 'Fixture content for isolated tests.');
  const manifestPath = join(setup.draft, 'module.json');
  const manifest = JSON.parse(readFileSync(manifestPath));
  manifest.requires = { tasks: '1.0.0' };
  writeFileSync(manifestPath, JSON.stringify(manifest));
  mkdirSync(join(setup.draft, 'skills/fixture-guide/scripts'));
  const sentinel = join(setup.root, 'imported-script-was-executed');
  writeFileSync(join(setup.draft, 'skills/fixture-guide/scripts/sentinel.py'),
    `from pathlib import Path\nPath(${JSON.stringify(sentinel)}).write_text("executed")\n`);
  const binary = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64');
  writeFileSync(join(setup.draft, 'skills/fixture-guide/icon.png'), binary);
  const claudeBefore = snapshot(join(setup.project, '.claude'));
  const codexBefore = snapshot(join(setup.project, '.codex'));
  const inventoryBefore = readFileSync(join(setup.project, '.workflow-kit.json'));
  const userBefore = snapshot(setup.user);
  const proposal = proposeSkill({ ...setup.proposalOptions, kind: 'external' });
  assert.equal(proposal.kind, 'external');
  assert.deepEqual(proposal.provenance, provenance);
  assert.equal(proposal.status, 'proposed');
  assert.equal(proposal.package.files.find(file => file.path.endsWith('icon.png')).text, null);
  assert.equal(proposal.package.scriptsExecuted, false);
  assert.deepEqual(snapshot(join(setup.project, '.claude')), claudeBefore);
  assert.deepEqual(snapshot(join(setup.project, '.codex')), codexBefore);
  assert.deepEqual(readFileSync(join(setup.project, '.workflow-kit.json')), inventoryBefore);
  const beforeUnapprovedAdd = snapshot(setup.project);
  const rawAdd = spawnSync('bash', ['module.sh', 'add', '--target', setup.project, '--module', setup.draft],
    { cwd: kitRoot, encoding: 'utf8' });
  assert.notEqual(rawAdd.status, 0);
  assert.match(rawAdd.stderr, /retained approved proposal/);
  const unapproved = spawnSync('bash', ['module.sh', 'add', '--target', setup.project, '--module',
    join(setup.project, '.workflow/skill-proposals/fixture-guide/package')], { cwd: kitRoot, encoding: 'utf8' });
  assert.notEqual(unapproved.status, 0);
  assert.match(unapproved.stderr, /requires explicit approval/);
  assert.throws(() => activateSkill({ target: setup.project, id: proposal.id, kitRoot }), /requires explicit approval/);
  assert.deepEqual(snapshot(setup.project), beforeUnapprovedAdd);
  // This synthetic fixture decision never approves a real external package.
  approveSkill({ target: setup.project, id: proposal.id, fingerprint: proposal.packageFingerprint,
    statement: 'Fixture user explicitly approves the synthetic external package and target' });
  const beforeDryRun = snapshot(setup.project);
  activateSkill({ target: setup.project, id: proposal.id, kitRoot, dryRun: true });
  assert.deepEqual(snapshot(setup.project), beforeDryRun);
  activateSkill({ target: setup.project, id: proposal.id, kitRoot });
  assert.equal(existsSync(sentinel), false);
  for (const client of ['.claude', '.codex']) {
    assert.equal(readFileSync(join(setup.project, client, 'skills/fixture-guide/SKILL.md'), 'utf8'), setup.skillText);
    assert.deepEqual(readFileSync(join(setup.project, client, 'skills/fixture-guide/icon.png')), binary);
  }
  assert.deepEqual(snapshot(setup.user), userBefore);
  assert.deepEqual(JSON.parse(readFileSync(join(setup.project, '.workflow-kit.json'))).modules.map(module => module.id).sort(),
    ['fixture-guide', 'memory', 'tasks']);
  assert.equal(presentSkill(setup.project, proposal.id).installation.version, '1.0.0');
  command('bash', [join(setup.project, '.claude/scripts/workflow-doctor.sh')]);
});
