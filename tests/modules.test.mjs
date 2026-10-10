import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, lstatSync, existsSync, rmSync, symlinkSync, cpSync, chmodSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { installOrAdd } from '../templates/project/.workflow/runtime/manage.mjs';
import { updateKit } from '../templates/project/.workflow/runtime/update.mjs';
import { loadCatalog, officialModules } from '../templates/project/.workflow/runtime/catalog.mjs';

const repository = resolve(new URL('..', import.meta.url).pathname);

function command(executable, args, expectedSuccess = true, environment = {}) {
  const result = spawnSync(executable, args, { cwd: repository, encoding: 'utf8', env: { ...process.env, ...environment } });
  const output = result.stdout + result.stderr;
  if (expectedSuccess) assert.equal(result.status, 0, output);
  else assert.notEqual(result.status, 0, output);
  return output;
}

function fixture(context, configuration = '') {
  const root = mkdtempSync(join(tmpdir(), 'workflow-module-test-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const project = join(root, 'project with spaces');
  const user = join(root, 'user with spaces');
  mkdirSync(project); mkdirSync(user);
  command('git', ['-C', project, 'init', '-q']);
  const config = join(root, 'project.env');
  writeFileSync(config, `PROJECT_NAME=Module fixture\nTASKS_DIR=planning notes/tasks\nINSTALL_GLOBAL_SKILLS=false\n${configuration}`);
  return { root, project, user, config };
}

function install(setup, extra = [], expectedSuccess = true) {
  return command('bash', ['install.sh', '--target', setup.project, '--user-root', setup.user, '--non-interactive', '--config', setup.config, ...extra], expectedSuccess);
}
function add(setup, extra, expectedSuccess = true) {
  return command('bash', ['module.sh', 'add', '--target', setup.project, ...extra], expectedSuccess);
}
function state(setup) { return JSON.parse(readFileSync(join(setup.project, '.workflow-kit.json'))); }
function read(setup, path) { return readFileSync(join(setup.project, path), 'utf8'); }
function snapshot(root) {
  const result = {};
  function visit(directory, prefix = '') {
    for (const name of readdirSync(directory).sort()) {
      if (name === '.git') continue;
      const relative = prefix + name;
      const absolute = join(directory, name);
      const metadata = lstatSync(absolute);
      result[relative] = metadata.isDirectory() ? 'directory' : `${metadata.mode}:${readFileSync(absolute).toString('base64')}`;
      if (metadata.isDirectory()) visit(absolute, relative + '/');
    }
  }
  visit(root);
  return result;
}
function makeModule(setup, moduleId, overrides = {}) {
  const source = join(setup.root, 'catalog', moduleId);
  mkdirSync(join(source, 'skills', moduleId), { recursive: true });
  writeFileSync(join(source, 'skills', moduleId, 'SKILL.md'), `---\nname: ${moduleId}\ndescription: Test external module.\n---\n\nUse only on request.\n`);
  writeFileSync(join(source, 'module.json'), JSON.stringify({ schemaVersion: 1, id: moduleId, version: '1.0.0', description: 'External test module', skills: [{ name: moduleId, source: `skills/${moduleId}` }], ...overrides }));
  return source;
}

test('minimal: selected capabilities only, project context preserved, dry run non-mutating and doctor healthy', context => {
  const setup = fixture(context);
  writeFileSync(join(setup.project, 'CLAUDE.md'), '# Local rules\n');
  writeFileSync(join(setup.project, 'AGENTS.md'), '# Agent rules\n');
  const before = snapshot(setup.project);
  assert.match(install(setup, ['--dry-run']), /DRY RUN/);
  assert.deepEqual(snapshot(setup.project), before);
  install(setup);
  assert.deepEqual(state(setup).modules.map(module => module.id), ['memory', 'tasks']);
  for (const absent of ['planning notes/tasks/reports', 'planning notes/tasks/bugs', 'planning notes/tasks/handoff', '.claude/scripts/weekly-report-status.sh', '.claude/skills/review-gate']) assert.equal(existsSync(join(setup.project, absent)), false, absent);
  assert.doesNotMatch(read(setup, '.workflow/PROJECT_RULES.md'), /weekly-report|review-gate|context-relay/);
  const sourceWriteTask = readFileSync(join(repository, 'modules/tasks/skills/write-task/SKILL.md'), 'utf8');
  const installedWriteTask = read(setup, '.claude/skills/write-task/SKILL.md');
  assert.equal(installedWriteTask, sourceWriteTask);
  assert.equal(read(setup, '.codex/skills/write-task/SKILL.md'), sourceWriteTask);
  assert.match(installedWriteTask, /for every remaining step/);
  assert.equal(existsSync(join(setup.project, '.agents')), false);
  assert.match(read(setup, 'CLAUDE.md'), /^# Local rules/);
  assert.match(read(setup, 'AGENTS.md'), /^# Agent rules/);
  assert.match(command('bash', [join(setup.project, '.claude/scripts/workflow-doctor.sh')]), /0 failure/);
  assert.doesNotMatch(command('bash', [join(setup.project, '.claude/hooks/show-handoff.sh')]), /Reporting/);
  assert.match(install(setup, [], false), /already installed/);
});

for (const [profile, selection, modules] of [
  ['minimal', ['--profile', 'minimal'], ['memory', 'tasks']],
  ['continuity', ['--profile', 'continuity'], ['memory', 'tasks', 'continuity']],
  ['quality and bugs', ['--modules', 'tasks,memory,quality,bugs'], ['memory', 'tasks', 'quality', 'bugs']],
]) test(`project workflow distribution: ${profile}, local policy preserved and optional skills match inventory`, context => {
  const setup = fixture(context);
  const policyPath = join(setup.project, 'local-branch-policy.md');
  const policy = 'Workflow changes stay on the current branch; application changes require a feature branch.\n';
  const guidance = '# Local project\n\nRead [local policy](local-branch-policy.md) before planning or editing.\n';
  writeFileSync(policyPath, policy);
  writeFileSync(join(setup.project, 'AGENTS.md'), guidance);
  writeFileSync(join(setup.project, 'CLAUDE.md'), guidance);
  writeFileSync(setup.config, readFileSync(setup.config, 'utf8') + `BRANCH_STRATEGY=custom\nBRANCH_POLICY_FILE=${policyPath}\n`);
  install(setup, selection);
  const inventory = state(setup);
  assert.deepEqual(new Set(inventory.modules.map(module => module.id)), new Set(modules));
  const source = readFileSync(join(repository, 'core/skills/project-workflow/SKILL.md'), 'utf8');
  for (const client of ['.claude', '.codex']) {
    const skillPath = join(client, 'skills/project-workflow/SKILL.md');
    assert.equal(read(setup, skillPath), source);
    for (const reference of source.matchAll(/\]\(([^)]+\.md)\)/g)) {
      assert.equal(existsSync(resolve(setup.project, client, 'skills/project-workflow', reference[1])), true, reference[1]);
    }
    for (const moduleId of ['tasks', 'continuity', 'quality', 'bugs']) {
      const manifest = JSON.parse(readFileSync(join(repository, 'modules', moduleId, 'module.json')));
      for (const skill of manifest.skills) {
        assert.equal(existsSync(join(setup.project, client, 'skills', skill.name, 'SKILL.md')), modules.includes(moduleId), `${client}/${skill.name}`);
      }
    }
  }
  assert.equal(read(setup, 'local-branch-policy.md'), policy);
  assert.equal(read(setup, '.workflow/branch-policy.md'), policy);
  assert.ok(read(setup, 'AGENTS.md').startsWith(guidance));
  assert.ok(read(setup, 'CLAUDE.md').startsWith(guidance));
  assert.match(command('bash', [join(setup.project, '.claude/scripts/workflow-doctor.sh')]), /0 failure/);
});

test('external module: added after install, settings, dependencies, mirrors, editable notes and exact repeat', context => {
  const setup = fixture(context); install(setup);
  const source = join(repository, 'examples/modules/project-notes');
  const before = snapshot(setup.project);
  const argumentsList = ['--module', source, '--set', 'project-notes.title=Notes personnelles'];
  add(setup, [...argumentsList, '--dry-run']);
  assert.deepEqual(snapshot(setup.project), before);
  add(setup, argumentsList);
  assert.match(read(setup, 'planning notes/tasks/notes/README.md'), /Notes personnelles/);
  assert.equal(read(setup, '.claude/skills/project-notes/SKILL.md'), read(setup, '.codex/skills/project-notes/SKILL.md'));
  for (const [path, value] of Object.entries(before)) {
    if (!['.workflow/PROJECT_RULES.md', '.workflow/components.tsv', '.workflow-kit.json'].includes(path)) assert.equal(snapshot(setup.project)[path], value, path);
  }
  writeFileSync(join(setup.project, 'planning notes/tasks/notes/README.md'), '# User notes\nKeep these.\n');
  const installed = snapshot(setup.project);
  add(setup, ['--module', source]);
  assert.deepEqual(snapshot(setup.project), installed);
  assert.match(command('bash', [join(setup.project, '.claude/scripts/workflow-doctor.sh')]), /0 failure/);
});

test('complete profile, conditional reporting integration, reporting add and branch pointers', context => {
  const setup = fixture(context); install(setup, ['--profile', 'continuity']);
  assert.doesNotMatch(read(setup, '.workflow/PROJECT_RULES.md'), /weekly-report/);
  assert.doesNotMatch(read(setup, '.claude/skills/project-handoff/SKILL.md'), /weekly-report/);
  add(setup, ['--modules', 'reporting']);
  assert.match(read(setup, '.workflow/PROJECT_RULES.md'), /module:reporting\/handoff/);
  command('git', ['-C', setup.project, 'switch', '-q', '-c', 'dev/example']);
  for (const [path, content] of [['todo/dev-example/README.md', '# Tasks'], ['memory/dev-example.md', '# Memory'], ['handoff/dev-example.md', '# Handoff']]) {
    const absolute = join(setup.project, 'planning notes/tasks', path);
    mkdirSync(resolve(absolute, '..'), { recursive: true }); writeFileSync(absolute, content);
  }
  const output = command('bash', [join(setup.project, '.claude/hooks/show-handoff.sh')]);
  assert.match(output, /todo\/dev-example\/README.md/); assert.match(output, /memory\/dev-example.md/); assert.match(output, /handoff\/dev-example.md/); assert.match(output, /Reporting/);
  add(setup, ['--modules', officialModules.join(',')]);
  assert.equal(state(setup).modules.length, 8);
  assert.match(command('bash', [join(setup.project, '.claude/scripts/workflow-doctor.sh')]), /0 failure/);
});

test('continuity: handoff instructions are installed and session start selects only the recent current branch', context => {
  const setup = fixture(context); install(setup, ['--profile', 'continuity']);
  const handoffSkill = read(setup, '.claude/skills/project-handoff/SKILL.md');
  assert.equal(read(setup, '.codex/skills/project-handoff/SKILL.md'), handoffSkill);
  assert.match(handoffSkill, /handoff\/<safe-branch>\.md/);
  assert.match(handoffSkill, /Resolve the current branch with `branch-router`/);
  assert.match(read(setup, '.workflow/PROJECT_RULES.md'), /Before ending unfinished work,\s*use `project-handoff`/);
  assert.match(read(setup, '.claude/skills/project-workflow/SKILL.md'), /`project-handoff` before ending unfinished work/);
  command('git', ['-C', setup.project, 'switch', '-q', '-c', 'dev/first']);
  const handoffDirectory = join(setup.project, state(setup).configuration.tasksDirectory, 'handoff');
  mkdirSync(handoffDirectory, { recursive: true });
  const firstHandoff = join(handoffDirectory, 'dev-first.md');
  const secondHandoff = join(handoffDirectory, 'dev-second.md');
  writeFileSync(firstHandoff, '# First branch handoff\n');
  writeFileSync(secondHandoff, '# Second branch handoff\n');
  const hook = join(setup.project, '.claude/hooks/show-handoff.sh');
  const firstOutput = command('bash', [hook]);
  assert.match(firstOutput, /handoff\/dev-first\.md/);
  assert.doesNotMatch(firstOutput, /handoff\/dev-second\.md/);
  command('git', ['-C', setup.project, 'switch', '-q', '-c', 'dev/second']);
  const secondOutput = command('bash', [hook]);
  assert.match(secondOutput, /handoff\/dev-second\.md/);
  assert.doesNotMatch(secondOutput, /handoff\/dev-first\.md/);
  const staleDate = new Date(Date.now() - 15 * 86400000);
  utimesSync(secondHandoff, staleDate, staleDate);
  assert.doesNotMatch(command('bash', [hook]), /handoff\/dev-second\.md/);
  assert.equal(readFileSync(firstHandoff, 'utf8'), '# First branch handoff\n');
  assert.equal(readFileSync(secondHandoff, 'utf8'), '# Second branch handoff\n');
});

test('discovery never activates a module; conditional rules activate when companion is added', context => {
  const setup = fixture(context);
  const source = makeModule(setup, 'external-note', { rules: [{ id: 'conditional', source: 'rule.md', point: 'task-validation', when: ['companion'] }] });
  writeFileSync(join(source, 'rule.md'), 'Conditional external contribution.\n');
  makeModule(setup, 'companion');
  install(setup, ['--catalog', join(setup.root, 'catalog')]);
  assert.equal(existsSync(join(setup.project, '.claude/skills/external-note')), false);
  add(setup, ['--module', source]);
  assert.doesNotMatch(read(setup, '.workflow/PROJECT_RULES.md'), /Conditional external/);
  add(setup, ['--modules', 'companion', '--catalog', join(setup.root, 'catalog')]);
  assert.match(read(setup, '.workflow/PROJECT_RULES.md'), /Conditional external/);
});

test('module hooks never execute in discovery, dry run or install; execute at session start', context => {
  const setup = fixture(context); install(setup);
  const source = makeModule(setup, 'external-hook', {
    files: [{ source: 'hook.mjs', target: '.claude/scripts/external-hook.mjs' }],
    hooks: [{ id: 'hello', point: 'session-start', runner: 'node', path: '.claude/scripts/external-hook.mjs', args: [] }],
  });
  writeFileSync(join(source, 'hook.mjs'), 'console.log("EXTERNAL_HOOK_RAN");\n');
  assert.doesNotMatch(command('bash', ['module.sh', 'list', '--catalog', join(setup.root, 'catalog')]), /EXTERNAL_HOOK_RAN/);
  assert.doesNotMatch(add(setup, ['--module', source, '--dry-run']), /EXTERNAL_HOOK_RAN/);
  assert.doesNotMatch(add(setup, ['--module', source]), /EXTERNAL_HOOK_RAN/);
  assert.match(command('bash', [join(setup.project, '.claude/hooks/show-handoff.sh')]), /EXTERNAL_HOOK_RAN/);
});

for (const [label, overrides, expected] of [
  ['missing dependency', { requires: { missing: '*' } }, /Missing module dependency/],
  ['incompatible dependency', { requires: { memory: '99.0.0' } }, /Incompatible version/],
  ['cycle', { requires: { 'invalid-module': '*' } }, /cycle/],
  ['unknown field', { surprise: true }, /Unknown manifest field/],
  ['reserved destination', { files: [{ source: 'payload.md', target: 'AGENTS.md' }] }, /Reserved target/],
  ['unsafe path', { files: [{ source: 'payload.md', target: '{{TASKS_DIR}}/../escape' }] }, /Unsafe path/],
  ['source escape', { files: [{ source: '../payload.md', target: '{{TASKS_DIR}}/safe.md' }] }, /Unsafe path/],
]) test(`reject ${label} before mutation`, context => {
  const setup = fixture(context); install(setup);
  const source = makeModule(setup, 'invalid-module', overrides);
  writeFileSync(join(source, 'payload.md'), 'payload');
  const before = snapshot(setup.project);
  assert.match(add(setup, ['--module', source], false), expected);
  assert.deepEqual(snapshot(setup.project), before);
});

test('collision and changed managed file block add without touching user work', context => {
  const setup = fixture(context); install(setup);
  const source = makeModule(setup, 'collision', { files: [{ source: 'payload.md', target: '{{TASKS_DIR}}/PROJECT_MEMORY.md', editable: true }] });
  writeFileSync(join(source, 'payload.md'), 'must not replace memory');
  let before = snapshot(setup.project);
  assert.match(add(setup, ['--module', source], false), /already owned/);
  assert.deepEqual(snapshot(setup.project), before);
  writeFileSync(join(setup.project, '.workflow/PROJECT_RULES.md'), '# Locally customized rules\n');
  before = snapshot(setup.project);
  assert.match(add(setup, ['--modules', 'reporting'], false), /Managed file changed/);
  assert.deepEqual(snapshot(setup.project), before);
});

test('duplicate identities, symlink sources, symlink destinations and invalid settings fail', context => {
  const setup = fixture(context); install(setup);
  const source = makeModule(setup, 'memory');
  assert.match(add(setup, ['--module', source], false), /Duplicate module identity/);
  const validSource = makeModule(setup, 'symbolic', { files: [{ source: 'link.md', target: '{{TASKS_DIR}}/link.md' }] });
  symlinkSync(join(setup.config), join(validSource, 'link.md'));
  assert.match(add(setup, ['--module', validSource], false), /Symlink refused/);
  const destinationSource = makeModule(setup, 'destination-link', { files: [{ source: 'payload.md', target: '{{TASKS_DIR}}/outside/value.md' }] });
  writeFileSync(join(destinationSource, 'payload.md'), 'payload');
  symlinkSync(setup.user, join(setup.project, 'planning notes/tasks/outside'));
  assert.match(add(setup, ['--module', destinationSource], false), /Symlink refused/);
  assert.match(add(setup, ['--module', join(repository, 'examples/modules/project-notes'), '--set', 'project-notes.unknown=value'], false), /Unknown module setting/);
});

test('version replacement and legacy inventory require explicit migration', context => {
  const setup = fixture(context); install(setup);
  const source = makeModule(setup, 'versioned'); add(setup, ['--module', source]);
  const manifest = JSON.parse(readFileSync(join(source, 'module.json'))); manifest.version = '2.0.0';
  writeFileSync(join(source, 'module.json'), JSON.stringify(manifest));
  const before = snapshot(setup.project);
  assert.match(add(setup, ['--module', source], false), /different content/);
  assert.deepEqual(snapshot(setup.project), before);
  writeFileSync(join(setup.project, '.workflow-kit.json'), '{"version":"0.1.0-dev"}');
  assert.match(add(setup, ['--modules', 'reporting'], false), /migration required/);
});

test('mid-add failure restores files, inventory, shared rules, directories and user exports', context => {
  const setup = fixture(context, 'INSTALL_GLOBAL_SKILLS=true\n'); install(setup);
  const before = snapshot(setup.project); const userBefore = snapshot(setup.user);
  for (const failurePoint of [1, 12, 'inventory']) {
  assert.throws(() => installOrAdd({ command: 'add', target: setup.project, catalogs: [join(repository, 'modules')],
    sources: [], modules: ['quality'], settings: {}, afterWrite: count => { if (count === failurePoint || (failurePoint === 'inventory' && state(setup).modules.some(module => module.id === 'quality'))) throw new Error('Injected failure'); } }), /Injected failure/);
  assert.deepEqual(snapshot(setup.project), before); assert.deepEqual(snapshot(setup.user), userBefore);
  }
});

test('unknown selection and invalid configuration leave first install untouched', context => {
  const setup = fixture(context); const before = snapshot(setup.project);
  assert.match(install(setup, ['--modules', 'unknown'], false), /Missing module dependency/);
  assert.match(install(setup, ['--profile', 'unknown'], false), /Unknown profile/);
  assert.deepEqual(snapshot(setup.project), before);
});

test('unmanaged Claude and Codex skills survive managed mirror synchronization', context => {
  const setup = fixture(context); install(setup);
  for (const client of ['.claude', '.codex']) {
    mkdirSync(join(setup.project, client, 'skills/local-only'), { recursive: true });
    writeFileSync(join(setup.project, client, 'skills/local-only/SKILL.md'), `${client} local content`);
  }
  command('bash', [join(setup.project, '.claude/scripts/sync-skills.sh')]);
  assert.equal(read(setup, '.claude/skills/local-only/SKILL.md'), '.claude local content');
  assert.equal(read(setup, '.codex/skills/local-only/SKILL.md'), '.codex local content');
  assert.match(command('bash', [join(setup.project, '.claude/scripts/workflow-doctor.sh')]), /0 failure/);
});

test('all official modules have a unique skill owner; all profiles and independent modules install', context => {
  const { catalog } = loadCatalog([join(repository, 'modules')], []);
  const owners = new Set();
  for (const { manifest } of catalog.values()) for (const skill of manifest.skills ?? []) {
    assert.equal(owners.has(skill.name), false, skill.name); owners.add(skill.name);
  }
  const expectedSkills = [
    'ants', 'architect', 'bug-fix-trace', 'bug-triage', 'code-simplification',
    'consistency-check', 'context-relay', 'done-check', 'explain-simply', 'explicit-naming',
    'failure-containment', 'grill-me', 'memory-report', 'merge-integrity', 'next-change',
    'novice-lens', 'perf-gate', 'project-handoff', 'replace-not-add', 'resource-ownership',
    'reuse', 'review-gate', 'soak-readiness', 'tdd', 'teach', 'type-honesty', 'validate-task',
    'wayfinder', 'weekly-report', 'write-task',
  ];
  assert.deepEqual([...owners].sort(), expectedSkills.sort());
  for (const moduleId of ['memory', 'tasks', 'bugs', 'reporting', 'learning', 'exploration']) {
    const setup = fixture(context); install(setup, ['--modules', moduleId]);
    assert.match(command('bash', [join(setup.project, '.claude/scripts/workflow-doctor.sh')]), /0 failure/);
  }
  const complete = fixture(context); install(complete, ['--profile', 'complete']);
  assert.equal(state(complete).modules.length, 8);
});

test('installation lock and required precommit are checked without overwriting project data', context => {
  const setup = fixture(context, 'REQUIRE_PRECOMMIT=true\n');
  const before = snapshot(setup.project);
  assert.match(install(setup, [], false), /pre-commit hook missing/);
  assert.deepEqual(snapshot(setup.project), before);
  writeFileSync(join(setup.project, '.git/hooks/pre-commit'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  install(setup);
  mkdirSync(join(setup.project, '.workflow-install.lock'));
  assert.match(add(setup, ['--modules', 'reporting'], false), /installation is active/);
});

test('planned file versus directory collision fails during dry run', context => {
  const setup = fixture(context); install(setup);
  const source = makeModule(setup, 'path-conflict', { files: [
    { source: 'payload.md', target: '{{TASKS_DIR}}/conflict' },
    { source: 'payload.md', target: '{{TASKS_DIR}}/conflict/nested.md' },
  ] });
  writeFileSync(join(source, 'payload.md'), 'payload');
  const before = snapshot(setup.project);
  assert.match(add(setup, ['--module', source, '--dry-run'], false), /destination conflict/);
  assert.deepEqual(snapshot(setup.project), before);
});

function updateFixture(context, extra = [], configuration = '') {
  const setup = fixture(context, configuration);
  const source = join(setup.root, 'kit source');
  const sourcePaths = ['core', 'templates', 'scripts', 'modules', 'module.sh', 'install.sh', 'VERSION'];
  mkdirSync(source);
  for (const path of sourcePaths) cpSync(join(repository, path), join(source, path), { recursive: true });
  command('git', ['-C', source, 'init', '-q']);
  command('git', ['-C', source, 'add', '.']);
  command('git', ['-C', source, '-c', 'user.name=Workflow fixture', '-c', 'user.email=fixture@example.invalid',
    '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Fixture baseline']);
  const workflow = join(source, 'core/skills/project-workflow/SKILL.md');
  writeFileSync(workflow, '---\nname: project-workflow\ndescription: Previous fixture router.\n---\n\nPrevious fixture route.\n');
  command('bash', [join(source, 'install.sh'), '--target', setup.project, '--user-root', setup.user,
    '--non-interactive', '--config', setup.config, ...extra]);
  for (const path of sourcePaths) cpSync(join(repository, path), join(source, path), { recursive: true });
  const taskRule = join(source, 'modules/tasks/rules/main.md');
  writeFileSync(taskRule, readFileSync(taskRule, 'utf8') + '\nUpdated fixture task rule.\n');
  const antsSkill = join(source, 'modules/tasks/skills/ants/SKILL.md');
  writeFileSync(antsSkill, readFileSync(antsSkill, 'utf8') + '\nCandidate fixture ANTS guidance.\n');
  return { ...setup, source };
}

function update(setup, extra = [], expectedSuccess = true) {
  return command('bash', [join(setup.source, 'module.sh'), 'update', '--target', setup.project, ...extra], expectedSuccess);
}
function preview(setup) {
  const output = update(setup, ['--dry-run']);
  const match = output.match(/^Plan: ([a-f0-9]{64})$/m);
  assert.ok(match, output);
  return { output, plan: match[1] };
}
function updateOptions(setup) {
  return { target: setup.project, kitRoot: setup.source, catalogs: [join(setup.source, 'modules')], sources: [], settings: {} };
}

for (const [profile, extra, configuration] of [
  ['minimal', ['--profile', 'minimal'], ''],
  ['continuity', ['--profile', 'continuity'], ''],
  ['quality', ['--modules', 'tasks,memory,quality'], ''],
  ['quality with exports', ['--modules', 'tasks,memory,quality'], 'INSTALL_GLOBAL_SKILLS=true\n'],
]) test(`update ${profile}: real source and module diff, preserved local data, mirrors, doctor and idempotence`, context => {
  const setup = updateFixture(context, extra, configuration);
  const initial = state(setup);
  const guidance = read(setup, 'AGENTS.md') + '\nLocal policy: an independent review is required before merging.\n';
  writeFileSync(join(setup.project, 'AGENTS.md'), guidance);
  writeFileSync(join(setup.project, 'CLAUDE.md'), guidance);
  writeFileSync(join(setup.project, initial.configuration.tasksDirectory, 'PROJECT_MEMORY.md'), '# My edited memory\n');
  mkdirSync(join(setup.project, '.workflow/local'), { recursive: true });
  writeFileSync(join(setup.project, '.workflow/local/policy.md'), 'Preserve this local policy.\n');
  const localArtifacts = [
    initial.configuration.tasksDirectory + '/todo/local-effort/01-task.md',
    initial.configuration.tasksDirectory + '/handoff/dev-local.md',
  ];
  for (const path of localArtifacts) {
    mkdirSync(resolve(setup.project, path, '..'), { recursive: true });
    writeFileSync(join(setup.project, path), 'Local user evidence: do not reset.\n');
  }
  const before = snapshot(setup.project), userBefore = snapshot(setup.user);
  const { output, plan } = preview(setup);
  assert.match(output, /Installed source: unknown/);
  assert.match(output, /Candidate source: .*"revision":"[a-f0-9]{40}".*"dirty":true/);
  assert.match(output, /DIFF project:\.claude\/skills\/project-workflow\/SKILL.md/);
  assert.match(output, /Updated fixture task rule/);
  assert.deepEqual(snapshot(setup.project), before);
  assert.deepEqual(snapshot(setup.user), userBefore);
  update(setup, ['--expect-plan', plan]);
  const after = state(setup);
  assert.deepEqual(after.selected, initial.selected);
  assert.deepEqual(after.configuration, initial.configuration);
  assert.deepEqual(new Set(after.modules.map(module => module.id)), new Set(initial.modules.map(module => module.id)));
  assert.equal(read(setup, 'AGENTS.md'), guidance);
  assert.equal(read(setup, 'CLAUDE.md'), guidance);
  for (const path of ['.workflow-kit.env', '.workflow/branch-policy.md', '.workflow/local/policy.md', initial.configuration.tasksDirectory + '/PROJECT_MEMORY.md', ...localArtifacts]) {
    assert.equal(snapshot(setup.project)[path], before[path], path);
  }
  assert.equal(read(setup, '.claude/skills/project-workflow/SKILL.md'), readFileSync(join(repository, 'core/skills/project-workflow/SKILL.md'), 'utf8'));
  assert.equal(read(setup, '.codex/skills/project-workflow/SKILL.md'), read(setup, '.claude/skills/project-workflow/SKILL.md'));
  assert.match(read(setup, '.workflow/PROJECT_RULES.md'), /Updated fixture task rule/);
  if (initial.configuration.installGlobalSkills) {
    for (const client of ['.claude', '.codex']) {
      assert.equal(readFileSync(join(setup.user, client, 'skills/ants/SKILL.md'), 'utf8'), read(setup, client + '/skills/ants/SKILL.md'));
      assert.match(read(setup, client + '/skills/ants/SKILL.md'), /Candidate fixture ANTS guidance/);
    }
  }
  assert.match(command('bash', [join(setup.project, '.claude/scripts/workflow-doctor.sh')]), /0 failure/);
  const updated = snapshot(setup.project), updatedUser = snapshot(setup.user);
  update(setup, ['--expect-plan', preview(setup).plan]);
  assert.deepEqual(snapshot(setup.project), updated);
  assert.deepEqual(snapshot(setup.user), updatedUser);
});

test('update plan refuses stale source, stale editable target, missing approval and wrong exact revision', context => {
  const setup = updateFixture(context);
  let plan = preview(setup).plan;
  assert.match(update(setup, [], false), /approval missing or stale/);
  assert.match(update(setup, ['--dry-run', '--revision', '0'.repeat(40)], false), /exact checked-out full SHA/);
  writeFileSync(join(setup.project, 'AGENTS.md'), read(setup, 'AGENTS.md') + '\nConcurrent user edit\n');
  let before = snapshot(setup.project);
  assert.match(update(setup, ['--expect-plan', plan], false), /approval missing or stale/);
  assert.deepEqual(snapshot(setup.project), before);
  plan = preview(setup).plan;
  const workflow = join(setup.source, 'core/skills/project-workflow/SKILL.md');
  writeFileSync(workflow, readFileSync(workflow, 'utf8') + '\nConcurrent source edit\n');
  before = snapshot(setup.project);
  assert.match(update(setup, ['--expect-plan', plan], false), /approval missing or stale/);
  assert.deepEqual(snapshot(setup.project), before);
});

for (const scenario of ['managed edit', 'user collision', 'removed file', 'dependency', 'downgrade', 'global divergence', 'unknown lineage', 'incompatible dependency', 'lock', 'selection change', 'missing source']) {
  test(`update rejects ${scenario} without mutation`, context => {
    const setup = updateFixture(context, ['--profile', 'minimal'], scenario === 'global divergence' ? 'INSTALL_GLOBAL_SKILLS=true\n' : '');
    let expected;
    if (scenario === 'managed edit') {
      writeFileSync(join(setup.project, '.claude/skills/project-workflow/SKILL.md'), 'User changed managed skill');
      expected = /Managed file changed/;
    } else if (scenario === 'user collision') {
      writeFileSync(join(setup.source, 'core/skills/project-workflow/local.md'), 'Package asset');
      writeFileSync(join(setup.project, '.claude/skills/project-workflow/local.md'), 'User asset');
      expected = /Collision/;
    } else if (scenario === 'removed file') {
      rmSync(join(setup.source, 'core/skills/branch-router/SKILL.md'));
      expected = /Managed file removal unsupported/;
    } else if (scenario === 'dependency' || scenario === 'downgrade') {
      const path = join(setup.source, 'modules/tasks/module.json');
      const manifest = JSON.parse(readFileSync(path));
      if (scenario === 'dependency') manifest.requires = { reporting: '*' };
      else manifest.version = '0.9.0';
      writeFileSync(path, JSON.stringify(manifest));
      expected = scenario === 'dependency' ? /would change installed modules/ : /downgrade refused/;
    } else if (scenario === 'global divergence') {
      writeFileSync(join(setup.user, '.claude/skills/ants/SKILL.md'), 'Divergent user export');
      expected = /Managed file changed/;
    } else if (scenario === 'incompatible dependency') {
      const path = join(setup.source, 'modules/tasks/module.json');
      const manifest = JSON.parse(readFileSync(path));
      manifest.requires = { memory: '99.0.0' };
      writeFileSync(path, JSON.stringify(manifest));
      expected = /Incompatible version/;
    } else if (scenario === 'lock') {
      mkdirSync(join(setup.project, '.workflow-install.lock'));
      expected = /Another workflow installation is active/;
    } else if (scenario === 'selection change') {
      expected = /preserves selection and settings/;
    } else if (scenario === 'missing source') {
      rmSync(join(setup.source, 'modules/tasks'), { recursive: true });
      expected = /Update source missing/;
    } else {
      const inventory = state(setup);
      inventory.source = { revision: '0'.repeat(40), fingerprint: 'unknown', dirty: false };
      writeFileSync(join(setup.project, '.workflow-kit.json'), JSON.stringify(inventory));
      expected = /unavailable or not an ancestor/;
    }
    const before = snapshot(setup.project), userBefore = snapshot(setup.user);
    assert.match(update(setup, scenario === 'selection change' ? ['--dry-run', '--modules', 'reporting'] : ['--dry-run'], false), expected);
    assert.deepEqual(snapshot(setup.project), before);
    assert.deepEqual(snapshot(setup.user), userBefore);
  });
}

test('update rechecks source and target under lock and rolls back injected write failure', context => {
  const setup = updateFixture(context);
  const plan = preview(setup).plan;
  const before = snapshot(setup.project), userBefore = snapshot(setup.user);
  for (const failurePoint of [1, 3, 'inventory']) {
    assert.throws(() => updateKit({ ...updateOptions(setup), expectPlan: plan, afterWrite: count => {
      if (count === failurePoint || (failurePoint === 'inventory' && state(setup).source)) throw new Error('Injected update failure');
    } }), /Injected update failure/);
    assert.deepEqual(snapshot(setup.project), before);
    assert.deepEqual(snapshot(setup.user), userBefore);
  }
  const workflow = join(setup.source, 'core/skills/project-workflow/SKILL.md');
  assert.throws(() => updateKit({ ...updateOptions(setup), expectPlan: plan, beforeApply: () => writeFileSync(workflow, readFileSync(workflow, 'utf8') + '\nLate edit\n') }), /Concurrent source change/);
  assert.deepEqual(snapshot(setup.project), before);
  const nextPlan = preview(setup).plan;
  assert.throws(() => updateKit({ ...updateOptions(setup), expectPlan: nextPlan, beforeApply: () => writeFileSync(join(setup.project, 'AGENTS.md'), read(setup, 'AGENTS.md') + '\nLate local edit\n') }), /Concurrent change/);
  assert.equal(read(setup, '.claude/skills/project-workflow/SKILL.md'), Buffer.from(before['.claude/skills/project-workflow/SKILL.md'].split(':').slice(1).join(':'), 'base64').toString());
  assert.equal(existsSync(join(setup.project, '.workflow-install.lock')), false);
});

test('update detects concurrent mode change before replacing a later file and restores prior writes', context => {
  const setup = updateFixture(context);
  const plan = preview(setup).plan;
  const mirrorPath = join(setup.project, '.codex/skills/project-workflow/SKILL.md');
  const previousContent = read(setup, '.claude/skills/project-workflow/SKILL.md');
  assert.throws(() => updateKit({ ...updateOptions(setup), expectPlan: plan, afterWrite: count => {
    if (count === 1) chmodSync(mirrorPath, 0o600);
  } }), /Concurrent change/);
  assert.equal(read(setup, '.claude/skills/project-workflow/SKILL.md'), previousContent);
  assert.equal(lstatSync(mirrorPath).mode & 0o777, 0o600);
  assert.equal(existsSync(join(setup.project, '.workflow-install.lock')), false);
});
