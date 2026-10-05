import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { proposeSkill } from '../templates/project/.workflow/runtime/skill-proposals.mjs';
import { fixture, snapshot, runtimeCall, command } from './skill-proposal-fixtures.mjs';

function approve(setup, proposal) {
  return runtimeCall(setup, 'approveSkill', { fingerprint: proposal.packageFingerprint,
    statement: 'Fixture user explicitly approves this exact package and target' });
}

test('E3: fresh installed-runtime processes retain silence and explicit refusal without activation', context => {
  const setup = fixture(context);
  const proposal = proposeSkill(setup.proposalOptions);
  const before = snapshot(setup.project);
  const resumed = runtimeCall(setup, 'presentSkill', {});
  assert.equal(resumed.status, 'proposed');
  assert.equal(resumed.decision, null);
  assert.equal(resumed.need, proposal.need);
  assert.deepEqual(resumed.package, proposal.package);
  assert.match(runtimeCall(setup, 'activateSkill', {}, false), /requires explicit approval/);
  assert.deepEqual(snapshot(setup.project), before);
  runtimeCall(setup, 'refuseSkill', { fingerprint: proposal.packageFingerprint, statement: 'Fixture user refuses' });
  const refusedSnapshot = snapshot(setup.project);
  const refused = runtimeCall(setup, 'presentSkill', {});
  assert.equal(refused.status, 'refused');
  assert.equal(refused.decision.statement, 'Fixture user refuses');
  assert.match(runtimeCall(setup, 'activateSkill', {}, false), /requires explicit approval/);
  assert.deepEqual(snapshot(setup.project), refusedSnapshot);
});

test('E3: resume after agreement uses the retained package; repeated activation is byte and mode identical', context => {
  const setup = fixture(context);
  const proposal = proposeSkill(setup.proposalOptions);
  approve(setup, proposal);
  const decisionBefore = readFileSync(join(setup.project, '.workflow/skill-proposals/fixture-guide/proposal.json'));
  const resumed = runtimeCall(setup, 'presentSkill', {});
  assert.equal(resumed.status, 'approved');
  assert.equal(resumed.installation, null);
  assert.equal(resumed.decision.packageFingerprint, proposal.packageFingerprint);
  assert.equal(resumed.decision.target, setup.project);
  // Only fixture-owned generated input is removed; activation must use the retained package.
  rmSync(setup.draft, { recursive: true });
  const userBefore = snapshot(setup.user);
  runtimeCall(setup, 'activateSkill', {});
  const installed = runtimeCall(setup, 'presentSkill', {});
  assert.equal(installed.status, 'approved');
  assert.equal(installed.installation.id, 'fixture-guide');
  assert.equal(installed.installation.version, '1.0.0');
  assert.equal(installed.installation.fingerprint, proposal.plannedModule.fingerprint);
  assert.deepEqual(readFileSync(join(setup.project, '.workflow/skill-proposals/fixture-guide/proposal.json')), decisionBefore);
  const beforeRepeat = snapshot(setup.project);
  runtimeCall(setup, 'activateSkill', { dryRun: true });
  runtimeCall(setup, 'activateSkill', {});
  command('bash', ['module.sh', 'add', '--target', setup.project,
    '--module', join(setup.project, '.workflow/skill-proposals/fixture-guide/package')]);
  assert.deepEqual(snapshot(setup.project), beforeRepeat);
  assert.deepEqual(snapshot(setup.user), userBefore);
  const inventory = JSON.parse(readFileSync(join(setup.project, '.workflow-kit.json')));
  assert.equal(inventory.modules.filter(module => module.id === 'fixture-guide').length, 1);
  command('bash', [join(setup.project, '.claude/scripts/workflow-doctor.sh')]);
  command('bash', ['module.sh', 'add', '--target', setup.project, '--modules', 'learning']);
  const afterAdditionalModule = snapshot(setup.project);
  runtimeCall(setup, 'activateSkill', {});
  assert.deepEqual(snapshot(setup.project), afterAdditionalModule);
});

test('E3: an unmanaged destination conflict preserves user content and inventory across resume', context => {
  const setup = fixture(context);
  const proposal = proposeSkill(setup.proposalOptions);
  approve(setup, proposal);
  const directory = join(setup.project, '.claude/skills/fixture-guide');
  mkdirSync(directory);
  writeFileSync(join(directory, 'SKILL.md'), 'User-owned skill must survive');
  const before = snapshot(setup.project);
  assert.match(runtimeCall(setup, 'activateSkill', {}, false), /Collision/);
  assert.deepEqual(snapshot(setup.project), before);
  assert.equal(runtimeCall(setup, 'presentSkill', {}).status, 'approved');
});

test('E3: copying an approved proposal to another project never transfers approval', context => {
  const setup = fixture(context);
  const proposal = proposeSkill(setup.proposalOptions);
  approve(setup, proposal);
  const originalBefore = snapshot(setup.project);
  const copy = join(setup.root, 'different project');
  cpSync(setup.project, copy, { recursive: true });
  const copiedSetup = { ...setup, project: copy };
  const resumed = runtimeCall(copiedSetup, 'presentSkill', {});
  assert.equal(resumed.status, 'obsolete');
  assert.ok(resumed.obsoleteReasons.includes('target_changed'));
  assert.match(runtimeCall(copiedSetup, 'activateSkill', {}, false), /obsolete/);
  assert.deepEqual(snapshot(setup.project), originalBefore);
  assert.equal(JSON.parse(readFileSync(join(copy, '.workflow-kit.json'))).modules.some(module => module.id === 'fixture-guide'), false);
});
