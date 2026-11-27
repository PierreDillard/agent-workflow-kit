import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/ants.mjs', import.meta.url));
const template = new URL('../examples/refinement.json', import.meta.url);

function fixture(context) {
  const root = mkdtempSync(join(tmpdir(), 'ants-continual-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  function run(command, args) {
    const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
    if (result.error) throw result.error;
    return result;
  }
  function git(...args) {
    const result = run('git', args);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  function ants(...args) { return run(process.execPath, [cli, ...args]); }
  function write(path, content) { writeFileSync(join(root, path), content); }
  function install() {
    const result = ants('init', '--yes', '--config', 'project.env', '--modules', 'quality');
    assert.equal(result.status, 0, result.stderr);
  }
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'ANTS tests');
  git('config', 'user.email', 'tests@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  return { root, git, ants, write, install };
}

test('verify uses literal installed commands, reports integrity warnings and keeps JSON separate', context => {
  const { root, ants, write, install } = fixture(context);
  write('project.env', "TASKS_DIR=planning notes/tasks\nINSTALL_GLOBAL_SKILLS=false\nTYPECHECK_COMMAND=printf '%s\\n' 'type output'\nTEST_COMMAND=test -f project.env\nACCEPTANCE_COMMAND=exit 7\n");
  install();
  const todo = 'planning notes/tasks/todo/fixture';
  mkdirSync(join(root, todo), { recursive: true });
  write(todo + '/README.md', '| Task |\n| --- |\n| plain row |\n');
  const result = ants('verify', '--json', '--integrity');
  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.passed, false);
  assert.deepEqual(report.results.map(({ name, status }) => [name, status]), [
    ['integrity', 'pass'], ['typecheck', 'pass'], ['test', 'pass'], ['acceptance', 'fail'],
  ]);
  assert.match(report.results[0].warnings[0], /Index row without annex link/);
  assert.equal(report.results.at(-1).code, 7);
  assert.match(result.stderr, /type output/);
  const envPath = 'planning notes/tasks/.workflow/kit.env';
  write(envPath, readFileSync(join(root, envPath), 'utf8') + 'UNRELATED=$(touch unintended)\n');
  assert.equal(ants('verify').status, 1);
  assert.equal(existsSync(join(root, 'unintended')), false);
  assert.equal(ants('verify', '--dry-run').status, 1);
  write(envPath, readFileSync(join(root, envPath), 'utf8').replace(/^TEST_COMMAND=.*$/m, "TEST_COMMAND='touch unintended'"));
  const integrityFailure = ants('verify', '--integrity', '--json');
  assert.equal(integrityFailure.status, 1);
  assert.deepEqual(JSON.parse(integrityFailure.stdout).results.map(({ name, status }) => [name, status]),
    [['integrity', 'fail']]);
  assert.equal(existsSync(join(root, 'unintended')), false);
});

test('verify fails closed without checks and spends a single bounded command budget', context => {
  const { root, ants, write } = fixture(context);
  const empty = ants('verify', '--json');
  assert.equal(empty.status, 1);
  assert.deepEqual(JSON.parse(empty.stdout).results, []);
  write('checks.env', 'TEST_COMMAND=sleep 2 && touch finished\nBUILD_COMMAND=touch skipped\n');
  const timeout = ants('verify', '--config', 'checks.env', '--timeout', '1', '--json');
  assert.equal(timeout.status, 1, timeout.stderr);
  assert.deepEqual(JSON.parse(timeout.stdout).results.map(({ status }) => status), ['timeout', 'skipped']);
  assert.equal(existsSync(join(root, 'finished')), false);
  assert.equal(existsSync(join(root, 'skipped')), false);
  assert.equal(ants('verify', '--timeout', '0').status, 1);
  write('checks.env', 'TEST_COMMAND=true\n');
  const success = ants('verify', '--config', 'checks.env', '--json');
  assert.equal(success.status, 0, success.stderr);
  assert.equal(JSON.parse(success.stdout).passed, true);
});

function refinement(context) {
  const setup = fixture(context);
  const { root, git, write, install } = setup;
  write('project.env', 'INSTALL_GLOBAL_SKILLS=false\n');
  install();
  git('switch', '-qc', 'integration');
  const record = 'tasks/refinements/fixture.json';
  mkdirSync(dirname(join(root, record)), { recursive: true });
  const evidence = JSON.parse(readFileSync(template, 'utf8'));
  function save() { write(record, JSON.stringify(evidence, null, 2) + '\n'); }
  save();
  git('add', '.');
  git('commit', '-qm', 'Register the experiment');
  const baseline = git('rev-parse', 'HEAD');
  git('switch', '-qc', 'candidate');
  const instruction = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  write('AGENTS.md', instruction + '\nCheck subscription cleanup when switching sources.\n');
  git('commit', '-qam', 'Clarify the subscription rule');
  const candidate = git('rev-parse', 'HEAD');
  const variants = (name, baselineVerdict) => ({
    baseline: { verdict: baselineVerdict, evidence: name + '-baseline', attempts: 1, seconds: 2 },
    candidate: { verdict: 'pass', evidence: name + '-candidate', attempts: 1, seconds: 2 },
  });
  Object.assign(evidence, {
    baseline, candidate,
    results: {
      reproduction: variants('reproduction', 'fail'),
      validation: variants('validation', 'fail'),
      negativeControl: variants('negative', 'pass'),
    },
    decision: { reviewer: 'Project maintainer', rationale: 'Independent improvement within budget' },
  });
  function commitEvidence() {
    save();
    git('commit', '-qam', 'Record the measured comparison');
    return git('rev-parse', 'HEAD');
  }
  return { ...setup, record, instruction, baseline, candidate, evidence, commitEvidence };
}

test('refine binds approval to the reviewed tip, promotes both commits and preserves evidence on revert', context => {
  const { root, git, ants, record, baseline, candidate, instruction, commitEvidence, write } = refinement(context);
  const tip = commitEvidence();
  git('switch', '-q', 'integration');
  const args = ['--record', record, '--tip', tip];
  const preview = ants('refine', 'plan', ...args);
  assert.equal(preview.status, 0, preview.stderr);
  assert.equal(git('rev-parse', 'HEAD'), baseline);
  const { plan } = JSON.parse(preview.stdout);
  assert.match(ants('refine', 'promote', ...args, '--approve-plan', 'wrong').stderr, /Human approval/);
  write('unfinished', '');
  assert.match(ants('refine', 'promote', ...args, '--approve-plan', plan).stderr, /clean integration worktree/);
  rmSync(join(root, 'unfinished'));
  const promoted = ants('refine', 'promote', ...args, '--approve-plan', plan);
  assert.equal(promoted.status, 0, promoted.stderr);
  assert.equal(git('rev-parse', 'HEAD'), tip);
  assert.match(ants('refine', 'plan', ...args).stderr, /integration branch has moved/);
  git('revert', '--no-edit', candidate);
  assert.equal(readFileSync(join(root, 'AGENTS.md'), 'utf8'), instruction);
  assert.equal(JSON.parse(readFileSync(join(root, record), 'utf8')).candidate, candidate);
});

test('refine rejects changed protocols, regressions, exceeded budgets and managed skill edits', context => {
  const { git, ants, write, record, evidence, commitEvidence, candidate, baseline } = refinement(context);
  const originalHypothesis = evidence.protocol.hypothesis;
  evidence.protocol.hypothesis = 'Changed after drafting';
  const changedProtocol = commitEvidence();
  git('reset', '--hard', candidate);
  evidence.protocol.hypothesis = originalHypothesis;
  evidence.results.negativeControl.candidate.verdict = 'fail';
  const regression = commitEvidence();
  git('reset', '--hard', candidate);
  evidence.results.negativeControl.candidate.verdict = 'pass';
  evidence.results.validation.candidate.attempts = 2;
  const exceededBudget = commitEvidence();
  git('reset', '--hard', baseline);
  const path = '.claude/skills/workflow-retro/SKILL.md';
  write(path, 'Managed skill overwritten\n');
  git('commit', '-qam', 'Edit an installed skill');
  evidence.candidate = git('rev-parse', 'HEAD');
  const managedEdit = commitEvidence();

  git('switch', '-q', 'integration');
  const preview = tip => ants('refine', 'plan', '--record', record, '--tip', tip);
  assert.match(preview(changedProtocol).stderr, /preserve the protocol/);
  assert.match(preview(regression).stderr, /negativeControl.candidate must record pass/);
  assert.match(preview(exceededBudget).stderr, /validation.candidate.attempts must be between/);
  assert.match(preview(managedEdit).stderr, /project-owned rule or skill/);
});
