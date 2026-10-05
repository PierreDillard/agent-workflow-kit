import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, lstatSync, existsSync, rmSync, symlinkSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { installOrAdd } from '../templates/project/.workflow/runtime/manage.mjs';
import { loadCatalog, officialModules } from '../templates/project/.workflow/runtime/catalog.mjs';
import { selectCatalogSkills } from '../scripts/skill-selection.mjs';

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
  assert.equal((installedWriteTask.match(/^\*\*Understanding — mandatory stop\*\*$/gm) ?? []).length, 1);
  assert.equal((installedWriteTask.match(/Insert the complete Required understanding block/g) ?? []).length, 2);
  assert.match(installedWriteTask, /for every remaining step/);
  assert.equal(existsSync(join(setup.project, '.agents')), false);
  assert.match(read(setup, 'CLAUDE.md'), /^# Local rules/);
  assert.match(read(setup, 'AGENTS.md'), /^# Agent rules/);
  assert.match(command('bash', [join(setup.project, '.claude/scripts/workflow-doctor.sh')]), /0 failure/);
  assert.doesNotMatch(command('bash', [join(setup.project, '.claude/hooks/show-handoff.sh')]), /Reporting/);
  assert.match(install(setup, [], false), /already installed/);
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

test('skill selection: read-only official proposal, explicit dependencies and existing installer integration', context => {
  const setup = fixture(context);
  writeFileSync(join(setup.project, 'project.txt'), 'Preserve project data.\n');
  const beforeProject = snapshot(setup.project);
  const beforeUser = snapshot(setup.user);
  const proposal = JSON.parse(command('bash', ['module.sh', 'select', '--skills', 'project-handoff']));
  assert.deepEqual(proposal.requestedModules, ['continuity']);
  assert.deepEqual(proposal.modules.map(module => module.id), ['memory', 'tasks', 'continuity']);
  assert.deepEqual(proposal.additionalSkills, ['ants', 'context-relay', 'memory-report', 'write-task']);
  assert.equal(proposal.requiresRuleApproval, true);
  assert.equal(proposal.isInstallation, false);
  assert.ok(proposal.modules.every(module => module.rules.every(rule => rule.content.length > 0)));
  assert.deepEqual(snapshot(setup.project), beforeProject);
  assert.deepEqual(snapshot(setup.user), beforeUser);
  assert.deepEqual(JSON.parse(command('bash', ['module.sh', 'select', '--skills', 'missing-skill'], false)).unresolvedSkills, ['missing-skill']);
  assert.match(command('bash', ['module.sh', 'select', '--skills', 'teach', '--catalog', 'examples/modules'], false), /official catalog only/);
  assert.match(command('bash', ['module.sh', 'add', '--target', setup.project, '--skills', 'teach'], false), /--skills is only supported by select/);
  assert.deepEqual(snapshot(setup.project), beforeProject);
  // Fixture assumes rule approval; this is installation proof, not a human approval test.
  const selectedModules = proposal.requestedModules.join(',');
  assert.match(install(setup, ['--modules', selectedModules, '--dry-run']), /DRY RUN/);
  assert.deepEqual(snapshot(setup.project), beforeProject);
  install(setup, ['--modules', selectedModules]);
  for (const client of ['.claude', '.codex']) {
    const skill = read(setup, `${client}/skills/project-handoff/SKILL.md`);
    assert.equal(skill, readFileSync(join(repository, 'modules/continuity/skills/project-handoff/SKILL.md'), 'utf8'));
  }
  assert.equal(read(setup, 'project.txt'), 'Preserve project data.\n');
  assert.deepEqual(snapshot(setup.user), beforeUser);
  assert.match(command('bash', [join(setup.project, '.claude/scripts/workflow-doctor.sh')]), /0 failure/);
});

test('skill selection: installed capabilities, exact repeat and conditional rule activation', context => {
  const setup = fixture(context); install(setup);
  add(setup, ['--modules', 'reporting']);
  writeFileSync(join(setup.project, 'planning notes/tasks/PROJECT_MEMORY.md'), '# User notes preserved\n');
  const beforeProject = snapshot(setup.project);
  const beforeUser = snapshot(setup.user);
  const selectArguments = ['module.sh', 'select', '--skills', 'project-handoff', '--target', setup.project];
  const proposal = JSON.parse(command('bash', selectArguments));
  assert.deepEqual(proposal.proposedSkills, ['context-relay', 'project-handoff']);
  assert.ok(proposal.installedSkills.includes('write-task'));
  assert.ok(proposal.installedSkills.includes('weekly-report'));
  assert.equal(proposal.modules.find(module => module.id === 'tasks').isInstalled, true);
  assert.deepEqual(proposal.activatedExistingRules.map(rule => [rule.module, rule.id]), [['reporting', 'handoff']]);
  assert.equal(command('bash', selectArguments), command('bash', selectArguments));
  assert.deepEqual(snapshot(setup.project), beforeProject);
  assert.deepEqual(snapshot(setup.user), beforeUser);
  // Isolated fixture assumes approval of the new and newly activated rules.
  add(setup, ['--modules', proposal.requestedModules.join(',')]);
  const repeated = JSON.parse(command('bash', selectArguments));
  assert.deepEqual(repeated.proposedSkills, []);
  assert.deepEqual(repeated.activatedExistingRules, []);
  assert.equal(repeated.requiresRuleApproval, false);
  const afterProject = snapshot(setup.project);
  add(setup, ['--modules', proposal.requestedModules.join(',')]);
  assert.deepEqual(snapshot(setup.project), afterProject);
  assert.deepEqual(snapshot(setup.user), beforeUser);
  assert.equal(read(setup, 'planning notes/tasks/PROJECT_MEMORY.md'), '# User notes preserved\n');
  const unresolved = JSON.parse(command('bash', ['module.sh', 'select', '--skills', 'teach,unknown-skill', '--target', setup.project], false));
  assert.deepEqual(unresolved.unresolvedSkills, ['unknown-skill']);
  assert.equal(unresolved.isComplete, false);
  assert.deepEqual(unresolved.requestedModules, ['learning']);
  assert.deepEqual(snapshot(setup.project), afterProject);
  writeFileSync(join(setup.project, '.workflow/PROJECT_RULES.md'), '# Concurrent user change\n');
  const changedProject = snapshot(setup.project);
  assert.match(command('bash', selectArguments, false), /Managed file changed/);
  assert.deepEqual(snapshot(setup.project), changedProject);
});

test('skill selection: missing dependency and conflicting owners refuse without installation', context => {
  const setup = fixture(context);
  const { catalog } = loadCatalog([join(repository, 'modules')], []);
  const before = snapshot(setup.project);
  const missingDependency = new Map(catalog);
  const continuity = catalog.get('continuity');
  missingDependency.set('continuity', { ...continuity, manifest: { ...continuity.manifest, requires: { missing: '*' } } });
  assert.throws(() => selectCatalogSkills(missingDependency, ['project-handoff']), /Missing module dependency/);
  const conflictingOwners = new Map(catalog);
  const learning = catalog.get('learning');
  conflictingOwners.set('learning', { ...learning, manifest: { ...learning.manifest, skills: [{ name: 'project-handoff', source: 'skills/teach' }] } });
  assert.throws(() => selectCatalogSkills(conflictingOwners, ['project-handoff']), /Ambiguous skill owner/);
  assert.deepEqual(snapshot(setup.project), before);
});

test('skill selection: changed catalog source cannot be presented as an identical installed module', context => {
  const setup = fixture(context); install(setup);
  const sourceRoot = join(setup.root, 'copied-official-catalog');
  cpSync(join(repository, 'modules'), sourceRoot, { recursive: true });
  const changedSource = join(sourceRoot, 'tasks/skills/write-task/SKILL.md');
  writeFileSync(changedSource, readFileSync(changedSource, 'utf8') + '\nChanged source content.\n');
  const { catalog } = loadCatalog([sourceRoot], []);
  const before = snapshot(setup.project);
  assert.throws(() => selectCatalogSkills(catalog, ['write-task'], state(setup)), /different content/);
  assert.deepEqual(snapshot(setup.project), before);
});

test('external inspection: complete review data, stable fingerprint and no script execution', context => {
  const setup = fixture(context);
  const source = makeModule(setup, 'review-only', {
    files: [{ source: 'hook.mjs', target: '.claude/scripts/review-only.mjs' }],
    hooks: [{ id: 'hook', point: 'session-start', runner: 'node', path: '.claude/scripts/review-only.mjs', args: [] }],
  });
  const marker = join(setup.root, 'external-script-ran');
  writeFileSync(join(source, 'hook.mjs'), `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(marker)}, 'executed');\n`);
  writeFileSync(join(source, 'LICENSE.txt'), 'Fixture license text.\n');
  writeFileSync(join(source, 'binary.bin'), Buffer.from([0, 255]));
  const beforeProject = snapshot(setup.project);
  const beforeUser = snapshot(setup.user);
  const argumentsList = ['module.sh', 'inspect', '--module', source];
  const review = JSON.parse(command('bash', argumentsList));
  assert.equal(review.module.id, 'review-only');
  assert.equal(review.requiresUserApproval, true);
  assert.equal(review.isActivation, false);
  assert.equal(review.scriptsExecuted, false);
  assert.ok(review.files.find(file => file.path === 'hook.mjs').text.includes(marker));
  assert.equal(review.files.find(file => file.path === 'binary.bin').text, null);
  assert.equal(review.files.find(file => file.path === 'LICENSE.txt').text, 'Fixture license text.\n');
  assert.equal(command('bash', argumentsList), command('bash', argumentsList));
  assert.equal(existsSync(marker), false);
  assert.deepEqual(snapshot(setup.project), beforeProject);
  assert.deepEqual(snapshot(setup.user), beforeUser);
  writeFileSync(join(source, 'hook.mjs'), '// Modified after review\n');
  const changed = JSON.parse(command('bash', argumentsList));
  assert.notEqual(changed.packageFingerprint, review.packageFingerprint);
  assert.equal(existsSync(marker), false);
});
