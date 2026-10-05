import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { proposeSkill } from '../templates/project/.workflow/runtime/skill-proposals.mjs';
import { installOrAdd } from '../templates/project/.workflow/runtime/manage.mjs';
import { fixture, snapshot, runtimeCall, kitRoot } from './skill-proposal-fixtures.mjs';

function approvedFixture(context) {
  const setup = fixture(context);
  const proposal = proposeSkill(setup.proposalOptions);
  runtimeCall(setup, 'approveSkill', { fingerprint: proposal.packageFingerprint, statement: 'Fixture explicit approval' });
  return setup;
}

test('E3: intercepted mid-activation failure rolls back, preserves approval and resumes safely', context => {
  const setup = approvedFixture(context);
  const before = snapshot(setup.project);
  assert.throws(() => installOrAdd({ command: 'add', target: setup.project, kitRoot,
    catalogs: [join(kitRoot, 'modules')], sources: [join(setup.project, '.workflow/skill-proposals/fixture-guide/package')],
    settings: {}, dryRun: false, afterWrite: () => { throw new Error('Fixture intercepted failure'); } }), /intercepted failure/);
  assert.deepEqual(snapshot(setup.project), before);
  assert.equal(existsSync(join(setup.project, '.workflow-install.lock')), false);
  assert.equal(runtimeCall(setup, 'presentSkill', {}).status, 'approved');
  runtimeCall(setup, 'activateSkill', {});
  assert.equal(runtimeCall(setup, 'presentSkill', {}).installation.version, '1.0.0');
});

test('E3: existing installer lock blocks resumed activation without changing files', context => {
  const setup = approvedFixture(context);
  mkdirSync(join(setup.project, '.workflow-install.lock'));
  const before = snapshot(setup.project);
  assert.match(runtimeCall(setup, 'activateSkill', {}, false), /Another workflow installation is active/);
  assert.deepEqual(snapshot(setup.project), before);
});

test('E3: changed installed file is preserved and blocks repetition rather than being overwritten', context => {
  const setup = approvedFixture(context);
  runtimeCall(setup, 'activateSkill', {});
  const skillPath = join(setup.project, '.claude/skills/fixture-guide/SKILL.md');
  writeFileSync(skillPath, 'User modification after installation');
  const claudeBefore = snapshot(join(setup.project, '.claude'));
  const codexBefore = snapshot(join(setup.project, '.codex'));
  const inventoryBefore = readFileSync(join(setup.project, '.workflow-kit.json'));
  const presented = runtimeCall(setup, 'presentSkill', {});
  assert.equal(presented.status, 'obsolete');
  assert.ok(presented.obsoleteReasons.includes('installed_files_changed'));
  assert.match(runtimeCall(setup, 'activateSkill', {}, false), /obsolete/);
  assert.deepEqual(snapshot(join(setup.project, '.claude')), claudeBefore);
  assert.deepEqual(snapshot(join(setup.project, '.codex')), codexBefore);
  assert.deepEqual(readFileSync(join(setup.project, '.workflow-kit.json')), inventoryBefore);
});

test('E3: retained package alteration after installation cannot reuse the installed version as approval', context => {
  const setup = approvedFixture(context);
  runtimeCall(setup, 'activateSkill', {});
  writeFileSync(join(setup.project, '.workflow/skill-proposals/fixture-guide/package/skills/fixture-guide/references/example.md'),
    'Unapproved revision after activation');
  const claudeBefore = snapshot(join(setup.project, '.claude'));
  const inventoryBefore = readFileSync(join(setup.project, '.workflow-kit.json'));
  assert.match(runtimeCall(setup, 'activateSkill', {}, false), /obsolete.*package_changed/);
  assert.deepEqual(snapshot(join(setup.project, '.claude')), claudeBefore);
  assert.deepEqual(readFileSync(join(setup.project, '.workflow-kit.json')), inventoryBefore);
});
