import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, writeFileSync, chmodSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { proposeSkill, presentSkill, approveSkill, refuseSkill, activateSkill } from '../templates/project/.workflow/runtime/skill-proposals.mjs';
import { fixture, snapshot, kitRoot, command } from './skill-proposal-fixtures.mjs';

function activeSnapshot(setup) {
  return { claude: snapshot(join(setup.project, '.claude')), codex: snapshot(join(setup.project, '.codex')),
    user: snapshot(setup.user), inventory: readFileSync(join(setup.project, '.workflow-kit.json')).toString('base64'),
    rules: readFileSync(join(setup.project, '.workflow/PROJECT_RULES.md')).toString('base64') };
}

function decision(setup, proposal) {
  return { target: setup.project, id: proposal.id, fingerprint: proposal.packageFingerprint,
    statement: 'Fixture decision on this exact package and target' };
}

function directAdd(setup, expectedMessage) {
  const result = spawnSync('bash', ['module.sh', 'add', '--target', setup.project, '--module',
    join(setup.project, '.workflow/skill-proposals/fixture-guide/package')], { cwd: kitRoot, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, expectedMessage);
}

test('E2: silence keeps a proposed draft; an empty decision cannot approve it', context => {
  const setup = fixture(context);
  const proposal = proposeSkill(setup.proposalOptions);
  const before = snapshot(setup.project);
  assert.equal(presentSkill(setup.project, proposal.id).status, 'proposed');
  assert.throws(() => approveSkill({ ...decision(setup, proposal), statement: '  ' }), /Explicit approval/);
  assert.throws(() => activateSkill({ target: setup.project, id: proposal.id, kitRoot }), /requires explicit approval/);
  directAdd(setup, /requires explicit approval/);
  assert.deepEqual(snapshot(setup.project), before);
  assert.equal(presentSkill(setup.project, proposal.id).decision, null);
});

test('E2: explicit refusal is durable, blocks all activation and preserves the active workflow', context => {
  const setup = fixture(context);
  const proposal = proposeSkill(setup.proposalOptions);
  const activeBefore = activeSnapshot(setup);
  command('node', ['scripts/skill-proposals.mjs', 'refuse', '--target', setup.project, '--id', proposal.id,
    '--fingerprint', proposal.packageFingerprint, '--statement', 'Fixture user refuses this package']);
  const refused = presentSkill(setup.project, proposal.id);
  assert.equal(refused.status, 'refused');
  assert.equal(refused.decision.statement, 'Fixture user refuses this package');
  assert.throws(() => activateSkill({ target: setup.project, id: proposal.id, kitRoot }), /requires explicit approval/);
  assert.throws(() => approveSkill(decision(setup, proposal)), /Explicit approval/);
  directAdd(setup, /requires explicit approval/);
  assert.deepEqual(activeSnapshot(setup), activeBefore);
});

const alterations = {
  'skill content': directory => writeFileSync(join(directory, 'skills/fixture-guide/SKILL.md'), 'Changed skill after approval'),
  'reference content': directory => writeFileSync(join(directory, 'skills/fixture-guide/references/example.md'), 'Changed reference'),
  'file mode': directory => chmodSync(join(directory, 'skills/fixture-guide/SKILL.md'), 0o700),
  'added file': directory => writeFileSync(join(directory, 'extra.md'), 'Unreviewed supporting file'),
  'removed file': directory => unlinkSync(join(directory, 'skills/fixture-guide/references/example.md')),
  'invalid manifest': directory => writeFileSync(join(directory, 'module.json'), '{invalid'),
};
for (const [label, alter] of Object.entries(alterations)) {
  test(`E2: ${label} after agreement invalidates approval without altering the active workflow`, context => {
    const setup = fixture(context);
    const proposal = proposeSkill(setup.proposalOptions);
    approveSkill(decision(setup, proposal));
    const directory = join(setup.project, '.workflow/skill-proposals/fixture-guide/package');
    alter(directory);
    const activeBefore = activeSnapshot(setup);
    const beforePresentation = snapshot(setup.project);
    assert.equal(presentSkill(setup.project, proposal.id).status, 'obsolete');
    assert.deepEqual(snapshot(setup.project), beforePresentation);
    assert.throws(() => activateSkill({ target: setup.project, id: proposal.id, kitRoot }), /obsolete.*renewed approval/);
    const record = JSON.parse(readFileSync(join(setup.project, '.workflow/skill-proposals/fixture-guide/proposal.json')));
    assert.equal(record.status, 'obsolete');
    assert.equal(record.decision.packageFingerprint, proposal.packageFingerprint);
    assert.throws(() => approveSkill(decision(setup, proposal)), /obsolete/);
    directAdd(setup, label === 'invalid manifest' ? /JSON|Unexpected|Expected|Invalid/ : /obsolete/);
    assert.deepEqual(activeSnapshot(setup), activeBefore);
  });
}

test('E2: reverting detected content does not restore the old approval', context => {
  const setup = fixture(context);
  const proposal = proposeSkill(setup.proposalOptions);
  approveSkill(decision(setup, proposal));
  const skillPath = join(setup.project, '.workflow/skill-proposals/fixture-guide/package/skills/fixture-guide/SKILL.md');
  const original = readFileSync(skillPath);
  writeFileSync(skillPath, 'Altered');
  assert.throws(() => activateSkill({ target: setup.project, id: proposal.id, kitRoot }), /obsolete/);
  writeFileSync(skillPath, original);
  assert.equal(presentSkill(setup.project, proposal.id).status, 'obsolete');
  assert.throws(() => activateSkill({ target: setup.project, id: proposal.id, kitRoot }), /obsolete/);
});

test('E2: changed target or installation invalidates approval; another proposal inherits no agreement', context => {
  const setup = fixture(context);
  const proposal = proposeSkill(setup.proposalOptions);
  approveSkill(decision(setup, proposal));
  const recordPath = join(setup.project, '.workflow/skill-proposals/fixture-guide/proposal.json');
  const record = JSON.parse(readFileSync(recordPath));
  writeFileSync(recordPath, JSON.stringify({ ...record, target: setup.project + '-other' }));
  assert.throws(() => activateSkill({ target: setup.project, id: proposal.id, kitRoot }), /obsolete.*target_changed/);
  const activeBefore = activeSnapshot(setup);
  const second = proposeSkill({ ...setup.proposalOptions, id: 'second-proposal' });
  assert.equal(second.status, 'proposed');
  assert.equal(second.decision, null);
  assert.throws(() => activateSkill({ target: setup.project, id: second.id, kitRoot }), /requires explicit approval/);
  approveSkill(decision(setup, second));
  command('bash', ['module.sh', 'add', '--target', setup.project, '--modules', 'learning']);
  const activeAfterChange = activeSnapshot(setup);
  assert.notDeepEqual(activeAfterChange, activeBefore);
  assert.throws(() => activateSkill({ target: setup.project, id: second.id, kitRoot }), /obsolete.*inventory_changed/);
  assert.deepEqual(activeSnapshot(setup), activeAfterChange);
});


test('E2: a revised package needs a new presentation and agreement before activation', context => {
  const setup = fixture(context);
  const initial = proposeSkill(setup.proposalOptions);
  approveSkill(decision(setup, initial));
  const packageRoot = join(setup.project, '.workflow/skill-proposals/fixture-guide/package');
  writeFileSync(join(packageRoot, 'skills/fixture-guide/references/example.md'), 'Revised reference');
  assert.throws(() => activateSkill({ target: setup.project, id: initial.id, kitRoot }), /obsolete/);
  writeFileSync(join(setup.draft, 'skills/fixture-guide/references/example.md'), 'Revised reference');
  const revised = proposeSkill({ ...setup.proposalOptions, id: 'revised-proposal' });
  assert.notEqual(revised.packageFingerprint, initial.packageFingerprint);
  assert.equal(revised.status, 'proposed');
  assert.equal(revised.decision, null);
  assert.throws(() => approveSkill({ ...decision(setup, revised), fingerprint: initial.packageFingerprint }), /Explicit approval/);
  const activeBefore = activeSnapshot(setup);
  assert.throws(() => activateSkill({ target: setup.project, id: revised.id, kitRoot }), /requires explicit approval/);
  assert.deepEqual(activeSnapshot(setup), activeBefore);
  approveSkill(decision(setup, revised));
  activateSkill({ target: setup.project, id: revised.id, kitRoot });
  assert.equal(readFileSync(join(setup.project, '.claude/skills/fixture-guide/references/example.md'), 'utf8'), 'Revised reference');
  const previous = JSON.parse(readFileSync(join(setup.project, '.workflow/skill-proposals/fixture-guide/proposal.json')));
  assert.equal(previous.status, 'obsolete');
  assert.equal(previous.decision.packageFingerprint, initial.packageFingerprint);
});
