import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { proposeSkill, presentSkill, approveSkill, activateSkill } from '../templates/project/.workflow/runtime/skill-proposals.mjs';
import { kitRoot, command, snapshot, fixture } from './skill-proposal-fixtures.mjs';

test('E1: portable creator, complete review outside discovery, explicit exact-package activation', context => {
  const { project, user, draft, skillText } = fixture(context);
  const creator = readFileSync(join(kitRoot, 'core/skills/write-a-skill/SKILL.md'));
  for (const client of ['.claude', '.codex']) {
    assert.deepEqual(readFileSync(join(project, client, 'skills/write-a-skill/SKILL.md')), creator);
    assert.ok(existsSync(join(project, client, 'skills/write-a-skill/LICENSE.txt')));
    assert.ok(existsSync(join(project, client, 'skills/write-a-skill/references/kit-approval.md')));
  }
  const originalInventory = JSON.parse(readFileSync(join(project, '.workflow-kit.json')));
  assert.deepEqual(originalInventory.modules.map(module => module.id), ['memory', 'tasks']);
  assert.match(readFileSync(join(project, '.workflow/components.tsv'), 'utf8'), /^write-a-skill\t/m);
  const activeBefore = ['.claude', '.codex'].map(client => snapshot(join(project, client)));
  const inventoryBefore = readFileSync(join(project, '.workflow-kit.json'));
  const rulesBefore = readFileSync(join(project, '.workflow/PROJECT_RULES.md'));
  const userBefore = snapshot(user);
  const proposal = proposeSkill({ target: project, id: 'fixture-guide', source: draft, kitRoot,
    need: 'Fixture note provenance is not covered', actions: 'Read input and draft notes', prerequisites: 'None' });
  assert.equal(proposal.status, 'proposed');
  assert.equal(proposal.isActivation, false);
  assert.equal(proposal.package.scriptsExecuted, false);
  assert.equal(proposal.package.files.length, 3);
  assert.equal(proposal.package.files.find(file => file.path.endsWith('SKILL.md')).text, skillText);
  for (const [index, client] of ['.claude', '.codex'].entries()) assert.deepEqual(snapshot(join(project, client)), activeBefore[index]);
  assert.deepEqual(readFileSync(join(project, '.workflow-kit.json')), inventoryBefore);
  assert.deepEqual(readFileSync(join(project, '.workflow/PROJECT_RULES.md')), rulesBefore);
  assert.deepEqual(snapshot(user), userBefore);
  assert.ok(existsSync(join(project, '.workflow/skill-proposals/fixture-guide/package/module.json')));
  const presented = JSON.parse(command('node', ['scripts/skill-proposals.mjs', 'present', '--target', project, '--id', 'fixture-guide']));
  assert.deepEqual(presented, presentSkill(project, 'fixture-guide'));
  const directAdd = spawnSync('bash', ['module.sh', 'add', '--target', project, '--module',
    join(project, '.workflow/skill-proposals/fixture-guide/package')], { cwd: kitRoot, encoding: 'utf8' });
  assert.notEqual(directAdd.status, 0);
  assert.match(directAdd.stderr, /requires explicit approval/);
  assert.deepEqual(readFileSync(join(project, '.workflow-kit.json')), inventoryBefore);
  // Fixture decision only: this does not prove a real user approval exchange.
  approveSkill({ target: project, id: 'fixture-guide', fingerprint: proposal.packageFingerprint,
    statement: 'Fixture user approves this exact package and project target' });
  const beforeDryRun = snapshot(project);
  activateSkill({ target: project, id: 'fixture-guide', kitRoot, dryRun: true });
  assert.deepEqual(snapshot(project), beforeDryRun);
  activateSkill({ target: project, id: 'fixture-guide', kitRoot });
  for (const client of ['.claude', '.codex']) assert.equal(readFileSync(join(project, client, 'skills/fixture-guide/SKILL.md'), 'utf8'), skillText);
  const installed = JSON.parse(readFileSync(join(project, '.workflow-kit.json')));
  assert.deepEqual(installed.modules.map(module => module.id), ['fixture-guide', 'memory', 'tasks']);
  assert.ok(installed.files.some(file => file.owner === 'fixture-guide'));
  assert.deepEqual(snapshot(user), userBefore);
  command('bash', [join(project, '.claude/scripts/workflow-doctor.sh')]);
});
